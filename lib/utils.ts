export const formatCurrency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
export const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
