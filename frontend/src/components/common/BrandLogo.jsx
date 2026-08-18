import handLogo from "../../assets/brand/signlearn-hand.svg";
import { Link } from "react-router-dom";

export default function BrandLogo({
  href = "/",
  to,
  ariaLabel = "SignLearn Kids, beranda",
  className = "",
  ...linkProps
}) {
  const content = (
    <>
      <img className="kids-brand-icon" src={handLogo} alt="" aria-hidden="true" />
      <span className="kids-brand-wordmark"><span>SignLearn</span><strong>Kids</strong></span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`kids-brand ${className}`.trim()} aria-label={ariaLabel} {...linkProps}>
        {content}
      </Link>
    );
  }

  return (
    <a href={href} className={`kids-brand ${className}`.trim()} aria-label={ariaLabel} {...linkProps}>
      {content}
    </a>
  );
}
