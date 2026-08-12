import { HandSignIcon } from "../ui/Icons";

export default function BrandLogo({ href = "/", ariaLabel = "SignLearn Kids, beranda", className = "" }) {
  return (
    <a href={href} className={`kids-brand ${className}`.trim()} aria-label={ariaLabel}>
      <span className="kids-brand-icon" aria-hidden="true"><HandSignIcon /></span>
      <span className="kids-brand-wordmark">SignLearn <strong>Kids</strong></span>
    </a>
  );
}
