import handLogo from "../../assets/brand/signlearn-hand.svg";

export default function BrandLogo({ href = "/", ariaLabel = "SignLearn Kids, beranda", className = "" }) {
  return (
    <a href={href} className={`kids-brand ${className}`.trim()} aria-label={ariaLabel}>
      <img className="kids-brand-icon" src={handLogo} alt="" aria-hidden="true" />
      <span className="kids-brand-wordmark"><span>SignLearn</span><strong>Kids</strong></span>
    </a>
  );
}
