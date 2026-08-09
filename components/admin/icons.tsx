/**
 * The dashboard's icon set, inline rather than from a package.
 *
 * A dozen 24px glyphs do not justify an icon dependency, and inlining keeps
 * them tree-shaken to exactly what is used. All are stroke-based and inherit
 * `currentColor`, so they take the colour of whatever they sit in.
 */

type IconProps = { className?: string };

function Svg({ children, className = "size-5" }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function OverviewIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Svg>
  );
}

export function CategoriesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </Svg>
  );
}

export function AttributesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h9l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </Svg>
  );
}

export function BrandsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 3 8v8l9 5 9-5V8Z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </Svg>
  );
}

export function ProductsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5Z" />
      <path d="M7.5 5.2 16.5 9.8V14" />
    </Svg>
  );
}

export function WarehousesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 21V9l9-5 9 5v12" />
      <path d="M8 21v-6h8v6" />
    </Svg>
  );
}

export function OrdersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 4h2l2.2 11a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.5L21 8H6" />
      <circle cx="10" cy="20" r="1.3" />
      <circle cx="18" cy="20" r="1.3" />
    </Svg>
  );
}

export function ImportsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 15V3m0 0L8 7m4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </Svg>
  );
}

export function ReportsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Svg>
  );
}

export function CouponsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6Z" />
      <path d="M13 5v2M13 11v2M13 17v2" strokeDasharray="0.1 3" />
    </Svg>
  );
}

export function CustomersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3.2 3.2 0 0 1 0 5M18 20a6 6 0 0 0-2-4.5" />
    </Svg>
  );
}

/** Staff accounts — a single figure with a badge, against Customers' pair. */
export function UsersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="7.5" r="3.5" />
      <path d="M3.5 20a6.5 6.5 0 0 1 11.4-4.3" />
      <path d="m15.5 19 2 2 4-4" />
    </Svg>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 4h16l-1 4a3 3 0 0 1-6 0 3 3 0 0 1-6 0Z" />
      <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
    </Svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 17l5-5-5-5M20 12H9" />
      <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
