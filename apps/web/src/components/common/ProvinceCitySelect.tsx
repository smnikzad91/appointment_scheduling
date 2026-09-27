"use client";

import { IRAN_PROVINCES, citiesOf } from "@appointment-scheduling/iran-locations";

// Cascading province → county selects backed by packages/iran-locations (the same list apps/api
// validates against). Choosing a province clears a city that isn't in it. Native <select>s on
// purpose: on phones they open the system picker, which handles 30+ options best.

export interface ProvinceCity {
  province: string;
  city: string;
}

export default function ProvinceCitySelect({
  value,
  onChange,
  selectClassName,
  labelClassName,
  anyOption,
  required,
}: {
  value: ProvinceCity;
  onChange: (next: ProvinceCity) => void;
  selectClassName: string;
  labelClassName?: string;
  /** Adds an "all" first option (search filters); otherwise a placeholder that can't be re-chosen. */
  anyOption?: { province: string; city: string };
  required?: boolean;
}) {
  const cities = citiesOf(value.province);
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className={labelClassName}>استان{required && <span className="text-red-500"> *</span>}</span>
        <select
          className={selectClassName}
          value={value.province}
          required={required}
          onChange={(e) => {
            const province = e.target.value;
            onChange({ province, city: citiesOf(province).includes(value.city) ? value.city : "" });
          }}
        >
          <option value="" disabled={!anyOption}>
            {anyOption?.province ?? "انتخاب استان"}
          </option>
          {IRAN_PROVINCES.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className={labelClassName}>شهر / شهرستان{required && <span className="text-red-500"> *</span>}</span>
        <select
          className={selectClassName}
          value={value.city}
          required={required}
          disabled={!value.province}
          onChange={(e) => onChange({ province: value.province, city: e.target.value })}
        >
          <option value="" disabled={!anyOption}>
            {!value.province ? "ابتدا استان" : anyOption?.city ?? "انتخاب شهر"}
          </option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
