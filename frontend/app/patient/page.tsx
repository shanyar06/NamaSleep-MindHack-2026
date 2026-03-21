import PatientForm from "@/components/PatientForm"

export default function PatientPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Patient Intake</h1>
        <p className="text-slate-300 mt-2">
          Enter recent sleep and lifestyle signals to receive an early insomnia-risk assessment.
        </p>
      </div>
      <PatientForm />
    </main>
  )
}