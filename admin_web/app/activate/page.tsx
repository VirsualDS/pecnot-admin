"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type PecnotPlan = "trial" | "monthly" | "semiannual" | "annual";

type FieldErrors = {
  studioName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  plan?: string;
  billingName?: string;
  vatNumber?: string;
  taxCode?: string;
  billingEmail?: string;
  recipientCode?: string;
  addressLine1?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  general?: string;
};

const PLAN_OPTIONS: Array<{
  value: PecnotPlan;
  title: string;
  price: string;
  subtitle: string;
  description?: string;
}> = [
  {
    value: "trial",
    title: "Prova gratuita",
    price: "€0",
    subtitle: "7 giorni gratuiti",
    description: "Nessun addebito automatico. Alla scadenza scegli tu se acquistare.",
  },
  {
    value: "monthly",
    title: "Mensile",
    price: "€9,99",
    subtitle: "Fatturazione mensile",
  },
  {
    value: "semiannual",
    title: "Semestrale",
    price: "€59,99",
    subtitle: "6 mesi di licenza",
  },
  {
    value: "annual",
    title: "Annuale",
    price: "€99,00",
    subtitle: "12 mesi di licenza",
  },
];

const MIN_PASSWORD_LENGTH = 8;

function isValidPlan(value: string | null): value is PecnotPlan {
  return (
    value === "trial" ||
    value === "monthly" ||
    value === "semiannual" ||
    value === "annual"
  );
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeText(value: string): string {
  return value.trim();
}

function ActivatePageInner() {
  const searchParams = useSearchParams();

  const [selectedPlan, setSelectedPlan] = useState<PecnotPlan>(() => {
    const fromQuery = searchParams.get("plan");
    return isValidPlan(fromQuery) ? fromQuery : "annual";
  });

  const [studioName, setStudioName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [billingName, setBillingName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [recipientCode, setRecipientCode] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Italia");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");

  const submitLabel = useMemo(() => {
    return selectedPlan === "trial" ? "Attiva prova gratuita" : "Continua al pagamento";
  }, [selectedPlan]);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    const normalizedEmail = normalizeEmail(email);
    const normalizedBillingEmail = normalizeEmail(billingEmail);

    if (!studioName.trim()) {
      nextErrors.studioName = "Inserisci il nome dello studio.";
    }

    if (!normalizedEmail) {
      nextErrors.email = "Inserisci l’email di accesso.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Inserisci un’email valida.";
    }

    if (!password.trim()) {
      nextErrors.password = "Inserisci una password.";
    } else if (password.trim().length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `La password deve contenere almeno ${MIN_PASSWORD_LENGTH} caratteri.`;
    }

    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = "Conferma la password.";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Le password non coincidono.";
    }

    if (!billingName.trim()) {
      nextErrors.billingName = "Inserisci l’intestazione di fatturazione.";
    }

    if (!vatNumber.trim() && !taxCode.trim()) {
      nextErrors.vatNumber = "Inserisci almeno la Partita IVA o il Codice Fiscale.";
      nextErrors.taxCode = "Inserisci almeno il Codice Fiscale o la Partita IVA.";
    }

    if (vatNumber.trim() && !/^[A-Za-z0-9]{11,16}$/.test(vatNumber.trim())) {
      nextErrors.vatNumber = "Formato Partita IVA non valido.";
    }

    if (taxCode.trim() && !/^[A-Za-z0-9]{11,16}$/.test(taxCode.trim())) {
      nextErrors.taxCode = "Formato Codice Fiscale non valido.";
    }

    if (!normalizedBillingEmail) {
      nextErrors.billingEmail = "Inserisci l’email o PEC per la fatturazione.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedBillingEmail)) {
      nextErrors.billingEmail = "Inserisci un’email o PEC valida.";
    }

    if (!addressLine1.trim()) {
      nextErrors.addressLine1 = "Inserisci l’indirizzo di fatturazione.";
    }

    if (!city.trim()) {
      nextErrors.city = "Inserisci la città.";
    }

    if (!province.trim()) {
      nextErrors.province = "Inserisci la provincia.";
    }

    if (!postalCode.trim()) {
      nextErrors.postalCode = "Inserisci il CAP.";
    }

    if (!country.trim()) {
      nextErrors.country = "Inserisci la nazione.";
    }

    if (!selectedPlan) {
      nextErrors.plan = "Seleziona un piano.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setFieldErrors({});

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studioName: normalizeText(studioName),
          email: normalizeEmail(email),
          password,
          confirmPassword,
          plan: selectedPlan,
          billingName: normalizeText(billingName),
          vatNumber: normalizeText(vatNumber),
          taxCode: normalizeText(taxCode),
          billingEmail: normalizeEmail(billingEmail),
          recipientCode: normalizeText(recipientCode),
          addressLine1: normalizeText(addressLine1),
          city: normalizeText(city),
          province: normalizeText(province).toUpperCase(),
          postalCode: normalizeText(postalCode),
          country: normalizeText(country),
        }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        url?: string;
        error?: string;
        field?: string;
      };

      if (!response.ok || !data.ok || !data.url) {
        const nextErrors: FieldErrors = {};

        if (
          data.field &&
          [
            "studioName",
            "email",
            "password",
            "confirmPassword",
            "plan",
            "billingName",
            "vatNumber",
            "taxCode",
            "billingEmail",
            "recipientCode",
            "addressLine1",
            "city",
            "province",
            "postalCode",
            "country",
          ].includes(data.field)
        ) {
          nextErrors[data.field as keyof FieldErrors] =
            data.error || "Controlla il campo indicato.";
        } else {
          nextErrors.general =
            data.error || "Errore durante la preparazione dell’attivazione.";
        }

        setFieldErrors(nextErrors);
        setMessage(data.error || "Impossibile proseguire con l’attivazione.");
        setIsSubmitting(false);
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Activate page checkout error:", error);
      setFieldErrors({
        general: "Errore di rete o server durante l’avvio dell’attivazione.",
      });
      setMessage("Errore di rete o server durante l’avvio dell’attivazione.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] text-[#0b1320]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:px-8">
        <header className="mx-auto flex w-full max-w-5xl flex-col gap-5 md:flex-row md:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_10px_25px_rgba(5,53,128,0.12)] ring-1 ring-[#dce5f3]">
            <img
              src="/favicon.ico"
              alt="PECNOT"
              className="h-14 w-14 object-contain"
            />
          </div>

          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5c6c86]">
              PECNOT
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#0b1320] md:text-5xl">
              Attiva PECNOT
            </h1>
            <p className="mt-4 text-[18px] leading-8 text-[#34445d]">
              Crea il tuo account licenza, inserisci i dati di fatturazione, scegli il piano
              e continua. Se selezioni la prova gratuita attivi subito 7 giorni senza
              addebito automatico. Se selezioni un piano a pagamento verrai inviato al checkout.
            </p>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="rounded-[28px] border border-[#d9e2ef] bg-white p-6 shadow-[0_18px_50px_rgba(11,19,32,0.08)] md:p-8">
            <div>
              <p className="inline-flex rounded-full bg-[#e9eef7] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#053580]">
                Attivazione
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0b1320]">
                Crea il tuo account
              </h2>
              <p className="mt-2 text-[16px] leading-7 text-[#51627d]">
                Questo account sarà quello da usare nel client PECNOT per il login licenza.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-8">
              {message ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {message}
                </div>
              ) : null}

              <div className="space-y-5">
                <div className="grid gap-5">
                  <div className="space-y-2">
                    <label htmlFor="studioName" className="block text-sm font-semibold text-[#0b1320]">
                      Nome studio
                    </label>
                    <input
                      id="studioName"
                      name="studioName"
                      type="text"
                      value={studioName}
                      onChange={(e) => setStudioName(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-2xl border border-[#d8e1ee] bg-white px-4 py-3 text-sm text-[#0b1320] outline-none transition placeholder:text-[#7c8ca3] focus:border-[#053580]"
                      placeholder="Es. Studio Legale Rossi"
                    />
                    {fieldErrors.studioName ? (
                      <p className="text-sm text-red-600">{fieldErrors.studioName}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-semibold text-[#0b1320]">
                      Email di accesso
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-2xl border border-[#d8e1ee] bg-white px-4 py-3 text-sm text-[#0b1320] outline-none transition placeholder:text-[#7c8ca3] focus:border-[#053580]"
                      placeholder="nome@studio.it"
                    />
                    {fieldErrors.email ? (
                      <p className="text-sm text-red-600">{fieldErrors.email}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="password" className="block text-sm font-semibold text-[#0b1320]">
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full rounded-2xl border border-[#d8e1ee] bg-white px-4 py-3 text-sm text-[#0b1320] outline-none transition placeholder:text-[#7c8ca3] focus:border-[#053580]"
                        placeholder="Almeno 8 caratteri"
                      />
                      {fieldErrors.password ? (
                        <p className="text-sm text-red-600">{fieldErrors.password}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#0b1320]">
                        Conferma password
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full rounded-2xl border border-[#d8e1ee] bg-white px-4 py-3 text-sm text-[#0b1320] outline-none transition placeholder:text-[#7c8ca3] focus:border-[#053580]"
                        placeholder="Ripeti la password"
                      />
                      {fieldErrors.confirmPassword ? (
                        <p className="text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-[#e4ebf4]" />

              <div className="space-y-5">
                <div>
                  <p className="inline-flex rounded-full bg-[#e9eef7] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#053580]">
                    Fatturazione
                  </p>
                  <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-[#0b1320]">
                    Dati di fatturazione
                  </h3>
                  <p className="mt-2 text-[15px] leading-7 text-[#51627d]">
                    Inserisci i dati fiscali e l’indirizzo da usare per la fattura.
                  </p>
                </div>

                <div className="grid gap-5">
                  <div className="space-y-2">
                    <label htmlFor="billingName" className="block text-sm font-semibold text-[#0b1320]">
                      Intestazione fattura / Ragione sociale
                    </label>
                    <input
                      id="billingName"
                      name="billingName"
                      type="text"
                      value={billingName}
                      onChange={(e) => setBillingName(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-2xl border border-[#d8e1ee] bg-white px-4 py-3 text-sm text-[#0b1320] outline-none transition placeholder:text-[#7c8ca3] focus:border-[#053580]"
                      placeholder="Es. Studio Legale Rossi SRL"
                    />
                    {fieldErrors.billingName ? (
                      <p className="text-sm text-red-600">{fieldErrors.billingName}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="vatNumber" className="block text-sm font-semibold text-[#0b1320]">
                        Partita IVA
                      </label>
                      <input
                        id="vatNumber"
                        name="vatNumber"
                        type="text"
                        value={vatNumber}
                        onChange={(e) => setVatNumber(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full rounded-2xl border border-[#d8e1ee] bg-white px-4 py-3 text-sm text-[#0b1320] outline-none transition placeholder:text-[#7c8ca3] focus:border-[#053580]"
                        placeholder="Es. 01234567890"
                      />
                      {fieldErrors.vatNumber ? (
                        <p className="text-sm text-red-600">{fieldErrors.vatNumber}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="taxCode" className="block text-sm font-semibold text-[#0b1320]">
                        Codice fiscale
                      </label>
                      <input
                        id="taxCode"
                        name="taxCode"
                        type="text"
                        value={taxCode}
                        onChange={(e) => setTaxCode(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full rounded-2xl border border-[#d8e1ee] bg-white px-4 py-3 text-sm text-[#0b1320] outline-none transition placeholder:text-[#7c8ca3] focus:border-[#053580]"
                        placeholder="Es. RSSMRA80A01H501Z"
                      />
                      {fieldErrors.taxCode ? (
                        <p className="text-sm text-red-600">{fieldErrors.taxCode}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="billingEmail" className="block text-sm font-semibold text-[#0b1320]">
                        Email / PEC fatturazione
                      </label>
                      <input
                        id="billingEmail"
                        name="billingEmail"
                        type="email"
                        value={billingEmail}
                        onChange={(e) => setBillingEmail(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full rounded-2xl border border-[#d8e1ee] bg-white px-4 py-3 text-sm text-[#0b1320] outline-none transition placeholder:text-[#7c8ca3] focus:border-[#053580]"
                        placeholder="fatture@studio.it"
                      />
                      {fieldErrors.billingEmail ? (
                        <p className="text-sm text-red-600">{fieldErrors.billingEmail}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="recipientCode" className="block text-sm font-semibold text-[#0b1320]">
                        Codice SDI
                      </label>
                      <input
                        id="recipientCode"
                        name="recipientCode"
                        type="text"
                        value={recipientCode}
                        onChange={(e) => setRecipientCode(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full rounded-2xl border border-[#d8e1ee] bg-white px-4 py-3 text-sm text-[#0b1320] outline-none transition placeholder:text-[#7c8ca3] focus:border-[#053580]"
                        placeholder="Facoltativo"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="addressLine1" className="block text-sm font-semibold text-[#0b1320]">
                      Indirizzo
                    </label>
                    <input
                      id="addressLine1"
                      name="addressLine1"
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-2xl border border-[#d8e1ee] bg-white px-4 py-3 text-sm text-[#0b1320] outline-none transition placeholder:text-[#7c8ca3] focus:border-[#053580]"
                      placeholder="Via, numero civico"
                    />
                    {fieldErrors.addressLine1 ? (
                      <p className="text-sm text-red-600">{fieldErrors.addressLine1}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-[1fr_120px_140px]">
                    <div className="space-y-2">
                      <label htmlFor="city" className="block text-sm font-semibold text-[#0b1320]">
                        Città
                      </label>
                      <input
                        id="city"
                        name="city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full rounded-2xl border border-[#d8e1ee] bg-white px-4 py-3 text-sm text-[#0b1320] outline-none transition placeholder:text-[#7c8ca3] focus:border-[#053580]"
                        placeholder="Es. Siracusa"
                      />
                      {fieldErrors.city ? (
                        <p className="text-sm text-red-600">{fieldErrors.city}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="province" className="block text-sm font-semibold text-[#0b1320]">
                        Prov.
                      </label>
                      <input
                        id="province"
                        name="province"
                        type="text"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full rounded-2xl border border-[#d8e1ee] bg-white px-4 py-3 text-sm text-[#0b1320] outline-none transition placeholder:text-[#7c8ca3] focus:border-[#053580]"
                        placeholder="SR"
                      />
                      {fieldErrors.province ? (
                        <p className="text-sm text-red-600">{fieldErrors.province}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="postalCode" className="block text-sm font-semibold text-[#0b1320]">
                        CAP
                      </label>
                      <input
                        id="postalCode"
                        name="postalCode"
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full rounded-2xl border border-[#d8e1ee] bg-white px-4 py-3 text-sm text-[#0b1320] outline-none transition placeholder:text-[#7c8ca3] focus:border-[#053580]"
                        placeholder="96018"
                      />
                      {fieldErrors.postalCode ? (
                        <p className="text-sm text-red-600">{fieldErrors.postalCode}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="country" className="block text-sm font-semibold text-[#0b1320]">
                      Nazione
                    </label>
                    <input
                      id="country"
                      name="country"
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-2xl border border-[#d8e1ee] bg-white px-4 py-3 text-sm text-[#0b1320] outline-none transition placeholder:text-[#7c8ca3] focus:border-[#053580]"
                      placeholder="Italia"
                    />
                    {fieldErrors.country ? (
                      <p className="text-sm text-red-600">{fieldErrors.country}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="h-px bg-[#e4ebf4]" />

              <div className="space-y-4">
                <div>
                  <p className="inline-flex rounded-full bg-[#e9eef7] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#053580]">
                    Piano
                  </p>
                  <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-[#0b1320]">
                    Scegli il piano
                  </h3>
                </div>

                <div className="grid gap-3">
                  {PLAN_OPTIONS.map((plan) => {
                    const active = selectedPlan === plan.value;

                    return (
                      <button
                        key={plan.value}
                        type="button"
                        onClick={() => setSelectedPlan(plan.value)}
                        disabled={isSubmitting}
                        className={`rounded-2xl border px-5 py-5 text-left transition ${
                          active
                            ? "border-[#053580] bg-[#053580] text-white shadow-[0_12px_30px_rgba(5,53,128,0.16)]"
                            : "border-[#d9e2ef] bg-white text-[#0b1320] hover:border-[#9eb4d7] hover:bg-[#f8fbff]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-base font-extrabold">{plan.title}</p>
                            <p
                              className={`mt-1 text-sm ${
                                active ? "text-white/80" : "text-[#5d6d86]"
                              }`}
                            >
                              {plan.subtitle}
                            </p>
                            {plan.description ? (
                              <p
                                className={`mt-2 text-sm leading-6 ${
                                  active ? "text-white/85" : "text-[#43546f]"
                                }`}
                              >
                                {plan.description}
                              </p>
                            ) : null}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-extrabold">{plan.price}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {fieldErrors.plan ? (
                  <p className="text-sm text-red-600">{fieldErrors.plan}</p>
                ) : null}
              </div>

              {fieldErrors.general ? (
                <p className="text-sm text-red-600">{fieldErrors.general}</p>
              ) : null}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-[#053580] px-4 py-4 text-sm font-bold text-white transition hover:bg-[#042d6d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Preparazione attivazione..." : submitLabel}
                </button>
              </div>
            </form>
          </section>

          <aside className="rounded-[28px] border border-[#d9e2ef] bg-[#edf2f8] p-6 shadow-[0_18px_50px_rgba(11,19,32,0.05)] md:p-8">
            <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#053580] shadow-sm">
              PECNOT
            </p>

            <h2 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-[#0b1320]">
              Meno tempo perso.
              <br />
              Più ordine nella PEC.
            </h2>

            <p className="mt-5 text-[18px] leading-8 text-[#40526f]">
              PECNOT elimina il lavoro manuale più ripetitivo e ti aiuta a tenere
              la casella PEC sotto controllo.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl border border-[#d7e1ef] bg-white p-5">
                <p className="text-sm font-bold text-[#053580]">Cosa succede dopo</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-[#43546f]">
                  <p>1. Inserisci i dati account e di fatturazione.</p>
                  <p>2. Scegli se attivare la prova gratuita o andare al checkout.</p>
                  <p>3. La licenza si attiva e puoi scaricare PECNOT.</p>
                  <p>4. Accedi al client desktop con le credenziali appena create.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[rgba(5,53,128,0.16)] bg-[#eef4ff] p-5 text-sm leading-7 text-[#24406e]">
                La prova gratuita dura 7 giorni, non prevede addebiti automatici e
                ti permette di verificare il flusso reale prima dell’acquisto.
              </div>

              <div className="rounded-2xl border border-[rgba(5,53,128,0.16)] bg-[#eef4ff] p-5 text-sm leading-7 text-[#24406e]">
                PECNOT archivia le PEC in locale ma non sostituisce il controllo umano.
                Prima di eliminare messaggi dal provider PEC va sempre verificata
                completezza e leggibilità dell’archivio creato.
              </div>

              <div className="rounded-2xl border border-[#d7e1ef] bg-white p-5 text-sm leading-7 text-[#43546f]">
                <p className="font-bold text-[#0b1320]">Tutti i piani includono</p>
                <div className="mt-3 space-y-2">
                  <p>• Monitoraggio automatico della PEC</p>
                  <p>• Download automatico di accettazioni, consegne e file EML</p>
                  <p>• Archivio notifiche e archivio completo della casella PEC</p>
                  <p>• Ricerca rapida nei file archiviati</p>
                  <p>• Aggiornamenti del client</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ActivatePageFallback() {
  return (
    <main className="min-h-screen bg-[#f3f5f9] text-[#0b1320]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 lg:px-8">
        <div className="rounded-2xl border border-[#d9e2ef] bg-white p-6 text-sm text-[#5c6c86] shadow-[0_18px_50px_rgba(11,19,32,0.08)]">
          Caricamento pagina attivazione...
        </div>
      </div>
    </main>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<ActivatePageFallback />}>
      <ActivatePageInner />
    </Suspense>
  );
}