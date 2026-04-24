<?php

namespace App\Http\Controllers;

use App\Models\PatientsModel;
use App\Models\ImmunizationRecord;
use App\Models\PrenatalVisit;
use App\Models\CurrentPregnancy;
use App\Models\PostnatalRecord;
use App\Models\PrenatalTopModel;
use App\Enums\YesNo;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportsController extends Controller
{
    /**
     * Build an immunization key "vaccine|dose_label"
     * (trimmed, LOWERCASED).
     * This MUST match the frontend key:
     *   `${vaccineKey.trim()}|${doseLabelKey.trim()}`.toLowerCase()
     */
    private function immKey(?string $vaccine, ?string $doseLabel): string
    {
        $v = trim((string) $vaccine);
        $d = trim((string) $doseLabel);
        return mb_strtolower($v . '|' . $d);
    }

    public function index(Request $request)
    {
        // Base date range (?from=YYYY-MM-DD&to=YYYY-MM-DD)
        $from = $request->input('from'); // may be null
        $to   = $request->input('to');   // may be null

        // Extra filters coming from the React page
        $month = $request->input('month'); // optional, kept for UI state
        $year  = $request->input('year');  // optional, kept for UI state

        // Normalize month/year → from/to if month & year provided but no explicit range
        if ($month && $year && (!$from || !$to)) {
            try {
                $m = (int) $month;
                $y = (int) $year;

                if ($m >= 1 && $m <= 12 && $y > 0) {
                    $start = Carbon::create($y, $m, 1)->startOfDay();
                    $end   = (clone $start)->endOfMonth();

                    $from = $start->toDateString(); // YYYY-MM-DD
                    $to   = $end->toDateString();   // YYYY-MM-DD
                }
            } catch (\Exception $e) {
                // If parsing fails, just leave from/to as-is (no crash).
            }
        }

        // Dropdown still sends this as health_center_id, but it is actually BARANGAY
        $barangayFilter = $request->input('health_center_id');

        // Filter state that the frontend will read back
        $filters = [
            'from'             => $from ?: null,
            'to'               => $to ?: null,
            'month'            => $month ?: null,
            'year'             => $year ?: null,
            'health_center_id' => $barangayFilter ?: null,
        ];

        /* --------------------------------------------------------------------
         * COLLECT PATIENT IDS FOR THIS BARANGAY (FROM RECORDS)
         * ------------------------------------------------------------------ */

        $patientIdsForBarangay = null;

        if ($barangayFilter) {
            $idSet = collect();

            // From patients table
            $idSet = $idSet->merge(
                PatientsModel::where('barangay', $barangayFilter)->pluck('id')
            );

            // From IMMUNIZATION records
            $idSet = $idSet->merge(
                ImmunizationRecord::where('barangay', $barangayFilter)->pluck('patient_id')
            );

            // From PRENATAL visits
            $idSet = $idSet->merge(
                PrenatalVisit::where('barangay', $barangayFilter)->pluck('patient_id')
            );

            // From POSTNATAL records
            $idSet = $idSet->merge(
                PostnatalRecord::where('barangay', $barangayFilter)->pluck('patient_id')
            );

            // From HBM current pregnancy
            $idSet = $idSet->merge(
                CurrentPregnancy::where('barangay', $barangayFilter)->pluck('patient_id')
            );

            $patientIdsForBarangay = $idSet
                ->filter()        // remove nulls
                ->unique()
                ->values();
        }

        /* --------------------------------------------------------------------
         * PATIENT-LEVEL SUMMARY  (SCOPED BY patientIdsForBarangay IF SET)
         * ------------------------------------------------------------------ */

        $patientsBase = PatientsModel::query();

        if ($barangayFilter) {
            if ($patientIdsForBarangay && $patientIdsForBarangay->isNotEmpty()) {
                $patientsBase->whereIn('id', $patientIdsForBarangay->all());
            } else {
                // No patients found for this barangay in any record → force empty
                $patientsBase->whereRaw('1 = 0');
            }
        }

        $totalPatients = (clone $patientsBase)->count();

        $patientsByType = (clone $patientsBase)
            ->select('patient_type', DB::raw('COUNT(*) as total'))
            ->groupBy('patient_type')
            ->orderBy('patient_type')
            ->get();

        $patientsByBarangay = (clone $patientsBase)
            ->select('barangay', DB::raw('COUNT(*) as total'))
            ->groupBy('barangay')
            ->orderBy('barangay')
            ->get();

        /* --------------------------------------------------------------------
         * IMMUNIZATION SUMMARY  (FILTER BY immunization_records.barangay)
         * ------------------------------------------------------------------ */

        $immBase = ImmunizationRecord::query()
            ->whereNotNull('date_given')
            ->when($from, fn ($q) => $q->whereDate('date_given', '>=', $from))
            ->when($to,   fn ($q) => $q->whereDate('date_given', '<=', $to))
            ->when($barangayFilter, fn ($q) =>
                $q->where('immunization_records.barangay', $barangayFilter)
            );

        $totalImmunizationRecords = (clone $immBase)->count();

        $totalImmunizationPatients = (clone $immBase)
            ->distinct('patient_id')
            ->count('patient_id');

        // Per-vaccine summary (high-level)
        $immunizationByVaccine = (clone $immBase)
            ->select(
                'vaccine',
                DB::raw('COUNT(*) as total_doses'),
                DB::raw('COUNT(DISTINCT patient_id) as patients')
            )
            ->groupBy('vaccine')
            ->orderBy('vaccine')
            ->get();

        // Per-vaccine + dose_label counts (for the C1 antigen table)
        $immDoseCounts = (clone $immBase)
            ->select('vaccine', 'dose_label', DB::raw('COUNT(*) as total'))
            ->groupBy('vaccine', 'dose_label')
            ->get()
            ->mapWithKeys(function ($row) {
                $key = $this->immKey($row->vaccine, $row->dose_label);
                return [$key => (int) $row->total];
            })
            ->all();

        // Sex-disaggregated dose counts:
        //   key (lowercased "vaccine|dose") => ['male' => x, 'female' => y]
        $immDoseSexCounts = (clone $immBase)
            ->join('patients as p', 'immunization_records.patient_id', '=', 'p.id')
            ->select('vaccine', 'dose_label', 'p.sex', DB::raw('COUNT(*) as total'))
            ->groupBy('vaccine', 'dose_label', 'p.sex')
            ->get()
            ->reduce(function (array $carry, $row) {
                $key = $this->immKey($row->vaccine, $row->dose_label);

                $sexRaw = strtolower(trim((string) $row->sex));
                $first  = $sexRaw[0] ?? '';

                if ($first === 'm') {
                    $sex = 'male';
                } elseif ($first === 'f') {
                    $sex = 'female';
                } else {
                    // unknown / blank sex → skip
                    return $carry;
                }

                if (!isset($carry[$key])) {
                    $carry[$key] = ['male' => 0, 'female' => 0];
                }

                $carry[$key][$sex] += (int) $row->total;
                return $carry;
            }, []);

        // Convenience helper for pulling from $immDoseCounts
        $dose = function (string $vaccine, string $doseLabel) use ($immDoseCounts): int {
            $key = $this->immKey($vaccine, $doseLabel);
            return isset($immDoseCounts[$key]) ? (int) $immDoseCounts[$key] : 0;
        };

        // FHSIS-style per-antigen totals
        $bcgTotal    = $dose('BCG Vaccine', 'At birth');
        $hepBTotal   = $dose('Hepatitis B Vaccine', 'At birth');

        $penta1Total = $dose('Pentavalent (DPT-HepB-Hib)', '6w');
        $penta2Total = $dose('Pentavalent (DPT-HepB-Hib)', '10w');
        $penta3Total = $dose('Pentavalent (DPT-HepB-Hib)', '14w');

        $opv1Total   = $dose('Oral Polio Vaccine (OPV)', '6w');
        $opv2Total   = $dose('Oral Polio Vaccine (OPV)', '10w');
        $opv3Total   = $dose('Oral Polio Vaccine (OPV)', '14w');

        $ipv1Total   = $dose('Inactivated Polio Vaccine (IPV)', '14w');

        $pcv1Total   = $dose('Pneumococcal Conjugate Vaccine PCV', '6w');
        $pcv2Total   = $dose('Pneumococcal Conjugate Vaccine PCV', '10w');
        $pcv3Total   = $dose('Pneumococcal Conjugate Vaccine PCV', '14w');

        // Childhood schedule (for "fully immunized" computation)
        $requiredMatrix = [
            'BCG Vaccine'                        => ['At birth'],
            'Hepatitis B Vaccine'                => ['At birth'],
            'Pentavalent (DPT-HepB-Hib)'         => ['6w', '10w', '14w'],
            'Oral Polio Vaccine (OPV)'           => ['6w', '10w', '14w'],
            'Inactivated Polio Vaccine (IPV)'    => ['14w'],
            'Pneumococcal Conjugate Vaccine PCV' => ['6w', '10w', '14w'],
            'Measles, Mumps, Rubella (MMR)'      => ['9m', '12m'],
        ];

        $requiredPairs = [];
        foreach ($requiredMatrix as $vaccine => $doses) {
            foreach ($doses as $doseLabel) {
                $requiredPairs[] = $this->immKey($vaccine, $doseLabel);
            }
        }

        // Group given doses by patient
        $givenGrouped = (clone $immBase)
            ->select('patient_id', 'vaccine', 'dose_label')
            ->get()
            ->groupBy('patient_id');

        // "Fully immunized" = has all vaccine|dose_label combos in $requiredPairs
        $fullyImmunizedPatientIds = $givenGrouped
            ->filter(function ($rows) use ($requiredPairs) {
                $givenPairs = $rows
                    ->map(function ($row) {
                        return $this->immKey($row->vaccine, $row->dose_label);
                    })
                    ->unique()
                    ->values()
                    ->all();

                if (empty($requiredPairs)) {
                    return false;
                }

                return empty(array_diff($requiredPairs, $givenPairs));
            })
            ->keys();

        $totalFullyImmunizedPatients = $fullyImmunizedPatientIds->count();

        /* --------------------------------------------------------------------
         * PRENATAL / PREGNANCY SUMMARY (M1 – B1 block)
         *   FILTER BY prenatal_visits.barangay
         * ------------------------------------------------------------------ */
        $prenatalBase = PrenatalVisit::query()
            ->when($from, fn ($q) => $q->whereDate('visit_date', '>=', $from))
            ->when($to,   fn ($q) => $q->whereDate('visit_date', '<=', $to))
            ->when($barangayFilter, fn ($q) =>
                $q->where('prenatal_visits.barangay', $barangayFilter)
            );

        $totalPrenatalVisits = (clone $prenatalBase)->count();

        // Unique patients per trimester
        $prenatalByTrimester = (clone $prenatalBase)
            ->select('trimester', DB::raw('COUNT(DISTINCT patient_id) as patients'))
            ->whereNotNull('trimester')
            ->groupBy('trimester')
            ->orderBy('trimester')
            ->get();

        // Patients with ≥4 visits (overall total) – but scoped to current range
        $patientsWith4PlusVisits = (clone $prenatalBase)
            ->select('patient_id', DB::raw('COUNT(*) as visits_count'))
            ->groupBy('patient_id')
            ->having('visits_count', '>=', 4)
            ->get()
            ->count();

        // Patients seen in 1st trimester (overall, but within range)
        $firstTrimesterPatients = (clone $prenatalBase)
            ->where('trimester', '1st')
            ->distinct('patient_id')
            ->count('patient_id');

        // Age-disaggregated counts for B1.1 (4+ visits) and B1.2 (seen for nutrition / 1st trimester)
        $fourplusAgeBuckets = [
            '10_14' => 0,
            '15_19' => 0,
            '20_49' => 0,
        ];

        $bmiAgeBuckets = [
            '10_14' => 0,
            '15_19' => 0,
            '20_49' => 0,
        ];

        $prenatalWithBirth = (clone $prenatalBase)
            ->join('patients as p', 'prenatal_visits.patient_id', '=', 'p.id')
            ->select(
                'prenatal_visits.patient_id',
                'prenatal_visits.visit_date',
                'prenatal_visits.trimester',
                'p.birthdate'
            )
            ->whereNotNull('p.birthdate')
            ->get();

        $perPatientPrenatal = [];

        foreach ($prenatalWithBirth as $row) {
            $pid = $row->patient_id;

            if (!isset($perPatientPrenatal[$pid])) {
                $perPatientPrenatal[$pid] = [
                    'total_visits'     => 0,
                    'first_trimester'  => false,
                    'first_visit_date' => null,
                    'birthdate'        => $row->birthdate,
                ];
            }

            $perPatientPrenatal[$pid]['total_visits']++;

            if (
                $perPatientPrenatal[$pid]['first_visit_date'] === null ||
                $row->visit_date < $perPatientPrenatal[$pid]['first_visit_date']
            ) {
                $perPatientPrenatal[$pid]['first_visit_date'] = $row->visit_date;
            }

            $trimester = is_string($row->trimester)
                ? strtolower(trim($row->trimester))
                : null;

            if (in_array($trimester, ['1st', 'first'], true)) {
                $perPatientPrenatal[$pid]['first_trimester'] = true;
            }
        }

        $ageBucket = function (?string $birthdate, ?string $referenceDate): ?string {
            if (!$birthdate || !$referenceDate) {
                return null;
            }

            try {
                $b = Carbon::parse($birthdate);
                $r = Carbon::parse($referenceDate);
            } catch (\Exception $e) {
                return null;
            }

            $age = $b->diffInYears($r);

            if ($age >= 10 && $age <= 14) {
                return '10_14';
            }
            if ($age >= 15 && $age <= 19) {
                return '15_19';
            }
            if ($age >= 20 && $age <= 49) {
                return '20_49';
            }

            return null;
        };

        foreach ($perPatientPrenatal as $pid => $info) {
            $refDate = $info['first_visit_date'] ?? ($to ?: Carbon::now()->toDateString());
            $bucket  = $ageBucket($info['birthdate'], $refDate);

            if (!$bucket) {
                continue;
            }

            if ($info['total_visits'] >= 4) {
                $fourplusAgeBuckets[$bucket]++;
            }

            if ($info['first_trimester']) {
                $bmiAgeBuckets[$bucket]++;
            }
        }

        $fourplus10_14Total = $fourplusAgeBuckets['10_14'];
        $fourplus15_19Total = $fourplusAgeBuckets['15_19'];
        $fourplus20_49Total = $fourplusAgeBuckets['20_49'];

        $bmiAssessed10_14Total = $bmiAgeBuckets['10_14'];
        $bmiAssessed15_19Total = $bmiAgeBuckets['15_19'];
        $bmiAssessed20_49Total = $bmiAgeBuckets['20_49'];

        $bmiAssessedTotal = $firstTrimesterPatients;

        // BMI category breakdown – not yet available from current schema
        $bmiNormalTotal = null;
        $bmiLowTotal    = null;
        $bmiHighTotal   = null;

        /**
         * 🔥 KEY CHANGE:
         * "Pregnant Patients" is now monthly/period-based:
         *   distinct patients that have prenatal visits in this filtered period.
         *
         * This makes the "Pregnant Patients" stat change when you change month/year.
         */
        $totalPregnantPatients = (clone $prenatalBase)
            ->distinct('patient_id')
            ->count('patient_id');

        // Prenatal top records (TT, Vit A) – scoped by patientIdsForBarangay AND date
        $ttBase = PrenatalTopModel::query();

        if ($barangayFilter) {
            if ($patientIdsForBarangay && $patientIdsForBarangay->isNotEmpty()) {
                $ttBase->whereIn('patient_id', $patientIdsForBarangay->all());
            } else {
                $ttBase->whereRaw('1 = 0');
            }
        }

        // TT2+
        $tt2PlusPatients = (clone $ttBase)
            ->when($from, fn ($q) => $q->whereDate('tt2_date', '>=', $from))
            ->when($to,   fn ($q) => $q->whereDate('tt2_date', '<=', $to))
            ->whereNotNull('tt2_date')
            ->distinct('patient_id')
            ->count('patient_id');

        // TT3+ (tt3, tt4, tt5)
        $tt3PlusPatients = (clone $ttBase)
            ->where(function ($q) use ($from, $to) {
                foreach (['tt3_date', 'tt4_date', 'tt5_date'] as $col) {
                    $q->orWhere(function ($qq) use ($col, $from, $to) {
                        $qq->whereNotNull($col);
                        if ($from) {
                            $qq->whereDate($col, '>=', $from);
                        }
                        if ($to) {
                            $qq->whereDate($col, '<=', $to);
                        }
                    });
                }
            })
            ->distinct('patient_id')
            ->count('patient_id');

        // Prenatal Vitamin A
        $prenatalVitAPatients = (clone $ttBase)
            ->when($from, fn ($q) => $q->whereDate('vitamin_a_date', '>=', $from))
            ->when($to,   fn ($q) => $q->whereDate('vitamin_a_date', '<=', $to))
            ->whereNotNull('vitamin_a_date')
            ->distinct('patient_id')
            ->count('patient_id');

        /* --------------------------------------------------------------------
         * POSTNATAL / AFTER-BIRTH SUMMARY (M1 – B3)
         *   FILTER BY postnatal_records.barangay
         * ------------------------------------------------------------------ */
        $postnatalBase = PostnatalRecord::query()
            ->when($from, fn ($q) => $q->whereDate('followup_date', '>=', $from))
            ->when($to,   fn ($q) => $q->whereDate('followup_date', '<=', $to))
            ->when($barangayFilter, fn ($q) =>
                $q->where('postnatal_records.barangay', $barangayFilter)
            );

        $totalPostnatalRecords = (clone $postnatalBase)->count();

        // Approximate deliveries as distinct postpartum women in the period
        $deliveriesTotal = (clone $postnatalBase)
            ->distinct('patient_id')
            ->count('patient_id');

        $exclusiveBreastfeedingCount = (clone $postnatalBase)
            ->where('exclusive_breastfeeding', YesNo::OO)
            ->count();

        // Postpartum women with ≥2 checkups
        $postpartumWith2PlusCheckups = (clone $postnatalBase)
            ->select('patient_id', DB::raw('COUNT(*) as visits'))
            ->groupBy('patient_id')
            ->having('visits', '>=', 2)
            ->count();

        // Postpartum Vitamin A and iron + folate
        $postnatalVitAPatients = (clone $postnatalBase)
            ->whereNotNull('vitamin_a_date')
            ->distinct('patient_id')
            ->count('patient_id');

        $postnatalIronFolatePatients = (clone $postnatalBase)
            ->whereNotNull('iron_folate_date')
            ->distinct('patient_id')
            ->count('patient_id');

        // Reuse postpartum iron+folate as a rough proxy for B1.5
        $ironFolateCompletedTotal = $postnatalIronFolatePatients;

        /* --------------------------------------------------------------------
         * HBM CURRENT (simple count, filter by current_pregnancies.barangay)
         * ------------------------------------------------------------------ */
        $currentBase = CurrentPregnancy::query()
            ->when($from, fn ($q) => $q->whereDate('visit_date', '>=', $from))
            ->when($to,   fn ($q) => $q->whereDate('visit_date', '<=', $to))
            ->when($barangayFilter, fn ($q) =>
                $q->where('current_pregnancies.barangay', $barangayFilter)
            );

        $totalCurrentPregnancyRecords = (clone $currentBase)->count();

        /* --------------------------------------------------------------------
         * RENDER
         * ------------------------------------------------------------------ */
        return Inertia::render('center/reports/index', [
            'filters' => $filters,

            'summary' => [
                'patients' => [
                    'total'       => $totalPatients,
                    'by_type'     => $patientsByType,
                    'by_barangay' => $patientsByBarangay,
                ],

                'immunization' => [
                    'total_records'            => $totalImmunizationRecords,
                    'total_patients'           => $totalImmunizationPatients,
                    'by_vaccine'               => $immunizationByVaccine,
                    'fully_immunized_patients' => $totalFullyImmunizedPatients,
                    'dose_counts'              => $immDoseCounts,
                    'dose_sex_counts'          => $immDoseSexCounts,

                    'bcg_total'    => $bcgTotal,
                    'hepB_total'   => $hepBTotal,
                    'penta1_total' => $penta1Total,
                    'penta2_total' => $penta2Total,
                    'penta3_total' => $penta3Total,
                    'opv1_total'   => $opv1Total,
                    'opv2_total'   => $opv2Total,
                    'opv3_total'   => $opv3Total,
                    'ipv1_total'   => $ipv1Total,
                    'pcv1_total'   => $pcv1Total,
                    'pcv2_total'   => $pcv2Total,
                    'pcv3_total'   => $pcv3Total,

                    // CPAB not yet derivable from current schema
                    'cpab_total'   => null,

                    // School-based Td/MR not yet wired
                    'fic_total'           => null,
                    'cic_total'           => null,
                    'td_grade1_total'     => null,
                    'mr_grade1_total'     => null,
                    'td_grade7_total'     => null,
                    'mr_grade7_total'     => null,
                ],

                'prenatal' => [
                    'total_pregnant_patients'    => $totalPregnantPatients,
                    'total_visits'               => $totalPrenatalVisits,
                    'patients_with_4plus_visits' => $patientsWith4PlusVisits,
                    'by_trimester'               => $prenatalByTrimester,

                    'fourplus_10_14_total'       => $fourplus10_14Total,
                    'fourplus_15_19_total'       => $fourplus15_19Total,
                    'fourplus_20_49_total'       => $fourplus20_49Total,

                    'bmi_assessed_10_14_total'   => $bmiAssessed10_14Total,
                    'bmi_assessed_15_19_total'   => $bmiAssessed15_19Total,
                    'bmi_assessed_20_49_total'   => $bmiAssessed20_49Total,

                    'first_trimester_patients'   => $firstTrimesterPatients,

                    'tt2_plus_patients'          => $tt2PlusPatients,
                    'tt3_plus_patients'          => $tt3PlusPatients,
                    'prenatal_vit_a_patients'    => $prenatalVitAPatients,

                    'bmi_assessed_total'         => $bmiAssessedTotal,
                    'bmi_normal_total'           => $bmiNormalTotal,
                    'bmi_low_total'              => $bmiLowTotal,
                    'bmi_high_total'             => $bmiHighTotal,

                    'calcium_completed_total'    => null,
                    'iodine_capsule_total'       => null,
                    'deworm_tablet_total'        => null,

                    'screened_syphilis_total'    => null,
                    'positive_syphilis_total'    => null,
                    'screened_hepb_total'        => null,
                    'positive_hepb_total'        => null,
                    'screened_hiv_total'         => null,
                    'tested_cbc_total'           => null,
                    'anemia_total'               => null,
                    'screened_gdm_total'         => null,
                    'positive_gdm_total'         => null,

                    'iron_folate_completed_total'=> $ironFolateCompletedTotal,
                ],

                'postnatal' => [
                    'total_records'           => $totalPostnatalRecords,
                    'exclusive_breastfeeding' => $exclusiveBreastfeedingCount,
                    'with_2plus_checkups'     => $postpartumWith2PlusCheckups,
                    'vitamin_a_patients'      => $postnatalVitAPatients,
                    'iron_folate_patients'    => $postnatalIronFolatePatients,
                ],

                'hbm_current' => [
                    'total_records' => $totalCurrentPregnancyRecords,
                ],

                'delivery' => [
                    'deliveries_total'                  => $deliveriesTotal,
                    'livebirths_total'                  => null,
                    'livebirths_male'                   => null,
                    'livebirths_female'                 => null,
                    'normal_birth_weight_total'         => null,
                    'low_birth_weight_total'            => null,
                    'unknown_birth_weight_total'        => null,
                    'facility_deliveries_total'         => null,
                    'public_facility_deliveries_total'  => null,
                    'private_facility_deliveries_total' => null,
                    'non_facility_deliveries_total'     => null,
                    'skilled_birth_attendant_total'     => null,
                    'attended_by_doctor_total'          => null,
                    'attended_by_nurse_total'           => null,
                    'attended_by_midwife_total'         => null,
                    'vaginal_deliveries_total'          => null,
                    'cesarean_deliveries_total'         => null,
                    'fullterm_births_total'             => null,
                    'preterm_births_total'              => null,
                    'fetal_deaths_total'                => null,
                    'abortions_miscarriages_total'      => null,
                ],

                'child_nutrition' => [
                    'bf_initiated_early_total' => null,
                    'preterm_iron_total'       => null,
                    'ebf_0_5_total'            => null,
                    'comp_feed_with_bf_total'  => null,
                    'comp_feed_no_bf_total'    => null,
                    'vitA_6_11_total'          => null,
                    'vitA_12_59_total'         => null,
                    'mnp_6_11_completed_total' => null,
                    'mnp_12_23_completed_total'=> null,
                    'stunted_total'            => null,
                    'wasted_total'             => null,
                    'mam_total'                => null,
                    'mam_sft_admitted_total'   => null,
                    'mam_sft_cured_total'      => null,
                    'mam_sft_defaulted_total'  => null,
                    'mam_sft_died_total'       => null,
                    'sam_total'                => null,
                    'sam_oct_admitted_total'   => null,
                    'sam_oct_cured_total'      => null,
                    'sam_oct_defaulted_total'  => null,
                    'sam_oct_died_total'       => null,
                    'overweight_obese_total'   => null,
                    'normal_total'             => null,
                ],

                'child_deworming' => [
                    'overall_1_19_2doses_total'      => null,
                    'psac_1_4_2doses_total'          => null,
                    'sac_5_9_2doses_total'           => null,
                    'adolescents_10_19_2doses_total' => null,
                    'younger_total'                  => null,
                    'older_total'                    => null,
                ],

                'child_sick' => [
                    'sick_6_11_seen_total'        => null,
                    'sick_6_11_vita_total'        => null,
                    'sick_12_59_seen_total'       => null,
                    'sick_12_59_vita_total'       => null,
                    'diarrhea_total'              => null,
                    'diarrhea_ors_total'          => null,
                    'diarrhea_ors_zinc_total'     => null,
                    'pneumonia_total'             => null,
                    'pneumonia_completed_total'   => null,
                    'other_conditions_total'      => null,
                ],
            ],
        ]);
    }
}
