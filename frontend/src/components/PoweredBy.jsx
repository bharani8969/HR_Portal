import { ButtonBase, Tooltip, Typography } from "@mui/material";
import { BRAND } from "../brand.js";
import { useSupport } from "./SupportProvider.jsx";

// Small vendor mark + "Powered by TREZION Technology". Clicking opens the concern form.
export function VendorMark({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect width="24" height="24" rx="6" fill="#0B1F4B" />
      <path d="M6 7h12M12 7v11" stroke="#18D5C8" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
export default function PoweredBy({ light = false, center = false, variant = "caption" }) {
  const { open } = useSupport();
  return (
    <Tooltip title="Have a question or concern? Contact us" arrow>
      <ButtonBase onClick={open} focusRipple aria-label={`Powered by ${BRAND.poweredBy}. Open the contact form`}
        sx={{ display: "inline-flex", alignItems: "center", gap: .75, justifyContent: center ? "center" : "flex-start", borderRadius: 2, px: .75, py: .4, transition: "background .2s ease, transform .2s ease",
          "&:hover": { background: light ? "rgba(255,255,255,.16)" : "color-mix(in srgb, var(--blue) 9%, transparent)", transform: "translateY(-1px)" }, "&:hover b": { textDecoration: "underline" } }}>
        <VendorMark size={16} />
        <Typography variant={variant} sx={{ color: light ? "rgba(255,255,255,.92)" : "#3D4C6B", letterSpacing: ".02em", lineHeight: 1.2, textAlign: "left" }}>
          Powered by <b>{BRAND.poweredBy}</b>
        </Typography>
      </ButtonBase>
    </Tooltip>
  );
}
