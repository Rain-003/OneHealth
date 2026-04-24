<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PatientRecord extends Model
{
    use HasFactory;

    protected $table = 'patient_records';

    protected $fillable = [
        'patient_id',
        'created_by',
        'visit_date',
        'title',
        'record_type', // mother | infant
        'notes',
    ];

    protected $casts = [
        'visit_date' => 'date',
    ];

    // 👇 This is required so ->with('patient') works
    public function patient()
    {
        return $this->belongsTo(PatientsModel::class, 'patient_id');
    }

    public function index(Request $request)
    {
        $query = Patient::query();

        // Search
        if ($q = trim((string) $request->input('q'))) {
            $query->where(function ($qq) use ($q) {
                $qq->where('full_name', 'like', "%{$q}%")
                ->orWhere('barangay', 'like', "%{$q}%");
            });
        }

        // Type filter
        if ($type = $request->input('type')) {
            if (in_array($type, ['immunization', 'pregnancy'], true)) {
                $query->where('patient_type', $type);
            }
        }

        // Sort
        switch ($request->input('sort', 'created_new')) {
            case 'created_old':
                $query->orderBy('created_at', 'asc');
                break;
            case 'name_asc':
                $query->orderBy('full_name', 'asc');
                break;
            case 'name_desc':
                $query->orderBy('full_name', 'desc');
                break;
            case 'birth_new':
                $query->orderBy('birthdate', 'desc');
                break;
            case 'birth_old':
                $query->orderBy('birthdate', 'asc');
                break;
            case 'created_new':
            default:
                $query->orderBy('created_at', 'desc');
                break;
        }

        // Pagination
        $perPage = (int) $request->input('per_page', 20);
        $perPage = $perPage > 0 && $perPage <= 100 ? $perPage : 20;

        $patients = $query->paginate($perPage)->withQueryString();

        return Inertia::render('center/records/index', [
            'patients' => $patients,
            'filters'  => $request->only('q', 'type', 'sort'),
            // 'counts' => [...], // if you still compute anything per patient
            'dashboardUrl' => route('center.dashboard'), // adjust to your route name
        ]);
    }

}
