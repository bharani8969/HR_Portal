// Spread onto a TextField to show the error as helper text directly under that input.
export const fe = (errors, key) => (errors?.[key] ? { error: true, helperText: errors[key] } : {});
