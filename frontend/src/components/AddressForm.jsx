const FIELDS = [
  ['fullName', 'Full name', 'sm:col-span-2'],
  ['line1', 'Street address', 'sm:col-span-2'],
  ['city', 'City', ''],
  ['state', 'State / region', ''],
  ['postalCode', 'Postal code', ''],
  ['country', 'Country', ''],
  ['phone', 'Phone', 'sm:col-span-2'],
];

export const EMPTY_ADDRESS = Object.fromEntries(FIELDS.map(([k]) => [k, '']));

export default function AddressForm({ value, onChange, idPrefix = 'addr' }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FIELDS.map(([key, label, span]) => (
        <div key={key} className={span}>
          <label className="label" htmlFor={`${idPrefix}-${key}`}>
            {label}
          </label>
          <input
            id={`${idPrefix}-${key}`}
            className="input"
            value={value[key]}
            required
            autoComplete={key === 'fullName' ? 'name' : key === 'postalCode' ? 'postal-code' : key === 'line1' ? 'address-line1' : key === 'phone' ? 'tel' : undefined}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
