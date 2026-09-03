import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 3.5 5.5 8l4.5 4.5" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6.25 8 10l4-3.75" />
    </Icon>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="3.25" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12.75" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function ImportIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2v7.5" />
      <path d="M5 6.75 8 9.75l3-3" />
      <path d="M2.75 11.5v1.25c0 .41.34.75.75.75h9c.41 0 .75-.34.75-.75V11.5" />
    </Icon>
  );
}

export function ExportIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 10V2.5" />
      <path d="M5 5.5 8 2.5l3 3" />
      <path d="M2.75 11.5v1.25c0 .41.34.75.75.75h9c.41 0 .75-.34.75-.75V11.5" />
    </Icon>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13.75 2.25 7.5 8.5" />
      <path d="M13.75 2.25 9.75 13.5l-2.25-5-5-2.25 11.25-4Z" />
    </Icon>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 5 2.5 8l3 3" />
      <path d="M10.5 5l3 3-3 3" />
    </Icon>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.75 7.19V3.5c0-.41.34-.75.75-.75h3.69c.2 0 .39.08.53.22l5.31 5.31a.75.75 0 0 1 0 1.06l-3.69 3.69a.75.75 0 0 1-1.06 0L2.97 7.72a.75.75 0 0 1-.22-.53Z" />
      <circle cx="5.75" cy="5.75" r=".85" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function SaveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 2.75h7.19c.2 0 .39.08.53.22l1.81 1.81c.14.14.22.33.22.53v7.94c0 .41-.34.75-.75.75h-9a.75.75 0 0 1-.75-.75v-9.75c0-.41.34-.75.75-.75Z" />
      <path d="M5.25 2.75v3.5h5.5v-3.5" />
      <path d="M5.25 13.25v-3.5h5.5v3.5" />
    </Icon>
  );
}

export function DuplicateIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5.75" y="5.75" width="7.5" height="7.5" rx="1" />
      <path d="M10.25 3.5v-.5a.75.75 0 0 0-.75-.75h-6a.75.75 0 0 0-.75.75v6c0 .41.34.75.75.75h.5" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.25M8 13.25v1.25M14.5 8h-1.25M2.75 8H1.5M12.6 3.4l-.9.9M4.3 11.7l-.9.9M12.6 12.6l-.9-.9M4.3 4.3l-.9-.9" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13.5 9.4A5.75 5.75 0 0 1 6.6 2.5a5.75 5.75 0 1 0 6.9 6.9Z" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Icon>
  );
}

export function DragHandleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="4" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="4" r="1" fill="currentColor" stroke="none" />
      <circle cx="6" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="12" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3.25v9.5M3.25 8h9.5" />
    </Icon>
  );
}
