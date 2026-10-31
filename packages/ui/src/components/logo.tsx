import { For, type ComponentProps } from "solid-js"

export const HoushiarLetters = [
  ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
].map((rows, index) => ({
  cx: index * 30 + 12,
  weak: "",
  fill: "var(--icon-strong-base)",
  stem: rows
    .flatMap((row, y) =>
      Array.from(row).flatMap((pixel, x) => (pixel === "1" ? [`M${index * 30 + x * 4 + 2} ${y * 4 + 6}h4v4h-4Z`] : [])),
    )
    .join(""),
}))

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path data-slot="logo-logo-mark-shadow" d="M4 8H12V12H4Z" fill="var(--icon-weak-base)" />
      <path data-slot="logo-logo-mark-o" d="M0 0H4V8H12V0H16V20H12V12H4V20H0Z" fill="var(--icon-strong-base)" />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20 40H60V60H20Z" fill="var(--icon-base)" />
      <path d="M0 0H20V40H60V0H80V100H60V60H20V100H0Z" fill="var(--icon-strong-base)" />
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 234 42"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <For each={HoushiarLetters}>{(letter) => <path d={letter.stem} fill={letter.fill} />}</For>
    </svg>
  )
}
