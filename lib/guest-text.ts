import { readPhone } from "@/lib/phone";

export type GuestLang = "he" | "en";

export const isGuestLang = (value: unknown): value is GuestLang => value === "he" || value === "en";

/** Israeli numbers get Hebrew; every other country gets English. */
export function guestLang(phone: string): GuestLang {
  return readPhone(phone)?.country === "IL" ? "he" : "en";
}

export const guestText = {
  he: {
    title: "סיכום ההזמנה שלך",
    thanks: "תודה שבחרתם בקייטרינג דובה דובאי",
    confirmed: "ההזמנה אושרה",
    details: "פרטי ההזמנה",
    date: "תאריך",
    time: "שעה",
    leaves: "יוצא בשעה",
    place: "מלון / כתובת",
    guests: "נפשות",
    guestNote: "פירוט",
    phone: "טלפון",
    allergy: "אלרגיה",
    notes: "הערות",
    dishes: "המנות",
    food: "מנות",
    delivery: "משלוח",
    deposit: "פלטה בפיקדון",
    returned: "בחזרה",
    total: "סה״כ",
    toPay: "לתשלום",
    cashNote: "תשלום במזומן במסירה",
    rounded: "מעוגל לעשרות",
    pdf: "שמירה כ-PDF",
    confirm: "לחץ לאישור הזמנה",
    confirming: "מאשרים",
    confirmPay: "אישור ותשלום",
    toCheckout: "עוברים לתשלום",
    confirmOnly: "אישור בלבד, אשלם אחר כך",
    payNow: "תשלום בכרטיס",
    paidDone: "ההזמנה אושרה ושולמה",
    cashDone: "ההזמנה אושרה · תשלום במזומן במסירה",
    failed: "האישור לא נשמר. נסו שוב.",
    switchTo: "English",
  },
  en: {
    title: "Your order summary",
    thanks: "Thank you for choosing Duba Dubai Kosher Catering",
    confirmed: "Order confirmed",
    details: "Order details",
    date: "Date",
    time: "Time",
    leaves: "Leaves at",
    place: "Hotel / address",
    guests: "Guests",
    guestNote: "Details",
    phone: "Phone",
    allergy: "Allergies",
    notes: "Notes",
    dishes: "Your dishes",
    food: "Dishes",
    delivery: "Delivery",
    deposit: "Tray deposit",
    returned: "Refunded",
    total: "Total",
    toPay: "To pay",
    cashNote: "Cash payment on delivery",
    rounded: "rounded up",
    pdf: "Save as PDF",
    confirm: "Confirm order",
    confirming: "Confirming",
    confirmPay: "Confirm & pay",
    toCheckout: "Opening payment",
    confirmOnly: "Confirm only, I'll pay later",
    payNow: "Pay by card",
    paidDone: "Order confirmed and paid",
    cashDone: "Order confirmed · Cash on delivery",
    failed: "Could not confirm. Please try again.",
    switchTo: "עברית",
  },
} as const;

export type GuestText = (typeof guestText)[GuestLang];
