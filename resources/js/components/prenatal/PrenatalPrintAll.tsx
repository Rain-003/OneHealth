// resources/js/components/prenatal/PrenatalPrintAll.tsx
import * as React from "react";
import Logo from "/public/build/assets/LOGO.svg";

/** ───── Types (match what your edit page already has) ───── */
export type PatientLite = {
  id: number;
  full_name?: string | null;
  birthdate?: string | null;
  barangay?: string | null;
  address?: string | null;
  sex?: string | null;
};

export type VisitRow = {
  id?: number;
  visit_date?: string | null;
  ga_weeks?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  weight_kg?: number | null;
  // ...extend as needed to match ITRVisits
};

export type RiskCodeRow = { code: string; description?: string | null; date_tagged?: string | null };
export type VitARow = { date_given?: string | null; dose?: string | null; remarks?: string | null };
export type HBMCurrRow = { hb?: number | null; date?: string | null; remarks?: string | null };
export type HBMHistRow = { date?: string | null; result?: string | null; remarks?: string | null };
export type BirthPlanRow = { item: string; value?: string | null };
export type PregnancyRow = { lmp?: string | null; edd?: string | null; gravida?: number | null; para?: number | null };

/** ───── Props holding ALL datasets ───── */
export type PrenatalPrintAllProps = {
  patient: PatientLite;
  pregnancy: PregnancyRow | null;
  birthplan: BirthPlanRow[];
  visits: VisitRow[];
  riskCodes: RiskCodeRow[];
  vitA: VitARow[];
  hbmCurrent: HBMCurrRow[];
  hbmHistory: HBMHistRow[];
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="print-section">
    <h2>{title}</h2>
    {children}
  </section>
);

/** Small helpers */
const Cell: React.FC<{ children: React.ReactNode }> = ({ children }) => <td>{children ?? "—"}</td>;
const Row = (props: React.HTMLAttributes<HTMLTableRowElement>) => <tr {...props} />;

/** ───── The document ───── */
export default function PrenatalPrintAll({
  patient,
  pregnancy,
  birthplan,
  visits,
  riskCodes,
  vitA,
  hbmCurrent,
  hbmHistory,
}: PrenatalPrintAllProps) {
  return (
    <div className="print-doc">
      {/* Header */}
      <header className="print-header">
        <img src={Logo} alt="Logo" className="logo" />
        <div>
          <h1>Prenatal Record</h1>
          <p className="muted">Consolidated printable report</p>
        </div>
      </header>

      {/* Patient block */}
      <Section title="Patient Information">
        <table className="kv">
          <tbody>
            <Row><Cell>Full name</Cell><Cell>{patient.full_name}</Cell></Row>
            <Row><Cell>Sex</Cell><Cell>{patient.sex}</Cell></Row>
            <Row><Cell>Birthdate</Cell><Cell>{patient.birthdate}</Cell></Row>
            <Row><Cell>Barangay</Cell><Cell>{patient.barangay}</Cell></Row>
            <Row><Cell>Address</Cell><Cell>{patient.address}</Cell></Row>
            <Row><Cell>Patient ID</Cell><Cell>{patient.id}</Cell></Row>
          </tbody>
        </table>
      </Section>

      {/* Pregnancy overview */}
      <Section title="Pregnancy Overview">
        <table className="kv">
          <tbody>
            <Row><Cell>LMP</Cell><Cell>{pregnancy?.lmp}</Cell></Row>
            <Row><Cell>EDD</Cell><Cell>{pregnancy?.edd}</Cell></Row>
            <Row><Cell>Gravida</Cell><Cell>{pregnancy?.gravida}</Cell></Row>
            <Row><Cell>Para</Cell><Cell>{pregnancy?.para}</Cell></Row>
          </tbody>
        </table>
      </Section>

      {/* Birth plan */}
      <Section title="Birth Plan">
        <table className="grid">
          <thead><tr><th>Item</th><th>Value</th></tr></thead>
          <tbody>
            {birthplan?.map((r, i) => (
              <Row key={i}><Cell>{r.item}</Cell><Cell>{r.value}</Cell></Row>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Visits */}
      <Section title="Antenatal Visits">
        <table className="grid">
          <thead>
            <tr>
              <th>Date</th><th>GA (w)</th><th>BP (mmHg)</th><th>Weight (kg)</th>
              {/* add columns you need */}
            </tr>
          </thead>
          <tbody>
            {visits?.map((v, i) => (
              <Row key={v.id ?? i}>
                <Cell>{v.visit_date}</Cell>
                <Cell>{v.ga_weeks}</Cell>
                <Cell>{v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic}` : "—"}</Cell>
                <Cell>{v.weight_kg}</Cell>
              </Row>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Risk codes */}
      <Section title="Risk Codes">
        <table className="grid">
          <thead><tr><th>Code</th><th>Description</th><th>Date</th></tr></thead>
          <tbody>
            {riskCodes?.map((r, i) => (
              <Row key={i}><Cell>{r.code}</Cell><Cell>{r.description}</Cell><Cell>{r.date_tagged}</Cell></Row>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Vitamin A */}
      <Section title="Vitamin A">
        <table className="grid">
          <thead><tr><th>Date</th><th>Dose</th><th>Remarks</th></tr></thead>
          <tbody>
            {vitA?.map((r, i) => (
              <Row key={i}><Cell>{r.date_given}</Cell><Cell>{r.dose}</Cell><Cell>{r.remarks}</Cell></Row>
            ))}
          </tbody>
        </table>
      </Section>

      {/* HBM current */}
      <Section title="Hemoglobin (Current)">
        <table className="grid">
          <thead><tr><th>Date</th><th>Hb</th><th>Remarks</th></tr></thead>
          <tbody>
            {hbmCurrent?.map((r, i) => (
              <Row key={i}><Cell>{r.date}</Cell><Cell>{r.hb}</Cell><Cell>{r.remarks}</Cell></Row>
            ))}
          </tbody>
        </table>
      </Section>

      {/* HBM history */}
      <Section title="Hemoglobin (History)">
        <table className="grid">
          <thead><tr><th>Date</th><th>Result</th><th>Remarks</th></tr></thead>
          <tbody>
            {hbmHistory?.map((r, i) => (
              <Row key={i}><Cell>{r.date}</Cell><Cell>{r.result}</Cell><Cell>{r.remarks}</Cell></Row>
            ))}
          </tbody>
        </table>
      </Section>

      <footer className="print-footer">
        <p>Generated on {new Date().toLocaleString()}</p>
      </footer>
    </div>
  );
}
