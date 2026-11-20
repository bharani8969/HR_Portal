import { createTheme } from "@mui/material";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import { BRAND } from "./brand.js";

const grad = "linear-gradient(90deg,var(--blue),var(--teal))";
const tint = (p) => `color-mix(in srgb, var(--blue) ${p}%, transparent)`;

export default createTheme({
  palette: {
    primary: { main: BRAND.primary, dark: BRAND.dark }, secondary: { main: BRAND.accent },
    background: { default: "#F4F7FE", paper: "#FFFFFF" }, text: { primary: BRAND.dark, secondary: "#5B6B8C" },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    h3: { fontWeight: 800, letterSpacing: "-0.02em" }, h4: { fontWeight: 800, letterSpacing: "-0.02em" },
    h5: { fontWeight: 800 }, h6: { fontWeight: 700 }, button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" }, rounded: { borderRadius: 18 } } },
    MuiButton: { styleOverrides: {
      root: { borderRadius: 12, transition: "transform .2s ease, box-shadow .2s ease, filter .2s ease", "&:hover": { transform: "translateY(-2px)" }, "&.Mui-disabled": { transform: "none" } },
      containedPrimary: { background: grad, boxShadow: `0 10px 24px ${tint(30)}`, "&:hover": { background: grad, filter: "brightness(1.06)", boxShadow: `0 14px 30px ${tint(40)}` }, "&.Mui-disabled": { background: "#E4EAF7", color: "#9AA7C2", boxShadow: "none" } },
      outlined: { borderWidth: 1.5, "&:hover": { borderWidth: 1.5 } },
    } },
    MuiOutlinedInput: { styleOverrides: {
      root: { borderRadius: 12, background: "#fff", transition: "box-shadow .2s ease", "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--blue)" }, "&.Mui-focused": { boxShadow: `0 0 0 4px ${tint(15)}` } },
      notchedOutline: { borderColor: "#DCE3F3" },
    } },
    MuiFormHelperText: { styleOverrides: { root: { marginLeft: 4, fontWeight: 600, "&.Mui-error": { animation: "fadeUp .25s ease both" } } } },
    MuiSelect: { defaultProps: { IconComponent: KeyboardArrowDownRounded } },
    MuiMenuItem: { styleOverrides: { root: {
      borderRadius: 10, margin: "2px 4px", padding: "10px 12px", fontWeight: 600, transition: "background .15s ease, transform .15s ease",
      "&:hover": { background: tint(10), transform: "translateX(2px)" },
      "&.Mui-selected": { background: tint(14), color: "var(--blue)", "&:hover": { background: tint(20) } },
    } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 22, boxShadow: "0 30px 80px rgba(11,31,75,.25)" } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 700, borderRadius: 10 } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 800, color: "#5B6B8C", background: "#F7F9FE", borderBottom: "1px solid #E4EAF7", textTransform: "uppercase", fontSize: 12, letterSpacing: ".04em" }, root: { borderBottom: "1px solid #EEF2FB" } } },
    MuiTableRow: { styleOverrides: { root: { transition: "background .15s ease", animation: "rowIn .45s ease both" } } },
    MuiAppBar: { defaultProps: { color: "inherit", elevation: 0 }, styleOverrides: { root: { backgroundImage: "none" } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
  },
});
