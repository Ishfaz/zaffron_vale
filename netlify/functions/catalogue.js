// Server-side price catalogue — the SINGLE SOURCE OF TRUTH for what things cost.
//
// WHY THIS FILE EXISTS
// The browser sends `amount` when creating an order, read from a `data-price`
// attribute in experiences.html. Anyone can open DevTools, change data-price to
// "100", and pay ₹1 for a ₹3,200 houseboat. Razorpay will happily capture it and
// the signature will verify, because the signature only proves the payment matches
// the order — not that the order was priced correctly.
//
// So the server never trusts the amount from the client. It looks the price up here.
//
// WHEN YOU CHANGE A PRICE you must change it in BOTH places:
//   1. this file (what the customer is actually charged)
//   2. the matching `data-price` in experiences.html (what the customer is shown)
// If they disagree, create-order rejects the booking rather than charging the wrong
// amount — a loud failure is better than a silent mispricing.
//
// All amounts are in PAISE (INR x 100). 150000 = ₹1,500.

export const EXPERIENCES = {
  'Wazwan dinner with the Wani family':        150000,
  'Dawn shikara & floating market':             90000,
  'Pashmina & kani-weaving workshop':          120000,
  'Saffron harvest day in Pampore':            180000,
  'Sufi night & rouf folk music':               80000,
  'Kahwa & Kashmiri bakery crawl':              70000,
  'Walnut-wood carving with a master':         100000,
  'Shepherd trail & meadow picnic':            140000,
  'Heritage houseboat with the Najar family':  320000
};

// Tour packages are enquiry-only right now (packages.html links to contact.html,
// there is no Book & Pay button). Add them here if you ever take direct payment.
export const PACKAGES = {};

export const MAX_GUESTS = 20;

// Hard ceiling on any single transaction, in paise. ₹5,00,000.
// Guards against a bug or an abusive request creating an absurd order.
export const MAX_ORDER_AMOUNT = 50000000;

/**
 * Resolve the authoritative price for an item.
 * @returns {{ok: true, unitPrice: number} | {ok: false, reason: string}}
 */
export function lookupUnitPrice(itemType, itemName) {
  const table = itemType === 'package' ? PACKAGES : EXPERIENCES;
  const price = table[itemName];

  if (typeof price !== 'number') {
    return { ok: false, reason: 'Unknown item: ' + itemName };
  }
  return { ok: true, unitPrice: price };
}
