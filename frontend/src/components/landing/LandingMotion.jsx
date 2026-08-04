import { useInView } from "../../hooks/useLandingMotion";

export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
  ...props
}) {
  const { ref, inView } = useInView();

  return (
    <Tag
      ref={ref}
      className={`landing-reveal ${inView ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` }}
      {...props}
    >
      {children}
    </Tag>
  );
}
