export const expenseKinds = [
  { id: "supplier", label: "ספק", plural: "ספקים", short: "ספקים", payee: "שם הספק", hint: "למשל: ירקות אבו עלי" },
  { id: "salary", label: "משכורת", plural: "משכורות", short: "משכורות", payee: "שם העובד", hint: "למשל: מוחמד, טבח" },
  { id: "fixed", label: "קבועה", plural: "הוצאות קבועות", short: "קבועות", payee: "שם ההוצאה", hint: "למשל: שכירות, חשמל, אינטרנט" },
] as const;

export const paymentMethods = [
  { id: "transfer", label: "העברה בנקאית" },
  { id: "cash", label: "מזומן" },
  { id: "card", label: "אשראי" },
  { id: "cheque", label: "צ׳ק" },
] as const;

export type ExpenseKind = (typeof expenseKinds)[number]["id"];
export type PaymentMethod = (typeof paymentMethods)[number]["id"];

export const isExpenseKind = (value: string): value is ExpenseKind => expenseKinds.some((kind) => kind.id === value);
export const isPaymentMethod = (value: string): value is PaymentMethod =>
  paymentMethods.some((method) => method.id === value);

export const kindLabel = (value: string) => expenseKinds.find((kind) => kind.id === value)?.label ?? "ספק";
export const methodLabel = (value: string) => paymentMethods.find((method) => method.id === value)?.label ?? "";
