/* ============================================================
   ZAFFRON VALLEY — interactions
   Vanilla JS, no dependencies. Progressive enhancement.
   ============================================================ */
(function () {
  "use strict";

  /* ---- Sticky header background on scroll ---- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 40) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu toggle ---- */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) links.classList.remove("open");
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".nav")) links.classList.remove("open");
    });
  }

  /* ---- Reveal on scroll ---- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + "ms";
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- Card filtering (packages / experiences) ---- */
  var filterBtns = document.querySelectorAll("[data-filter]");
  var filterables = document.querySelectorAll("[data-cat]");
  if (filterBtns.length && filterables.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cat = btn.getAttribute("data-filter");
        filterBtns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        filterables.forEach(function (item) {
          var cats = (item.getAttribute("data-cat") || "").split(" ");
          var show = cat === "all" || cats.indexOf(cat) !== -1;
          item.classList.toggle("hide", !show);
        });
      });
    });
  }

  /* ---- Contact form validation + submit ---- */
  var form = document.querySelector("form[data-validate]");
  if (form) {
    var ok = form.parentNode.querySelector(".form-ok");

    // A no-JS native form POST that failed server-side redirects back here with
    // ?error=1. Surface it so the visitor knows the enquiry did not go through.
    if (window.location.search.indexOf("error=1") !== -1) {
      var bootErr = form.querySelector(".form-error");
      if (bootErr) bootErr.style.display = "block";
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;
      form.querySelectorAll("[required]").forEach(function (input) {
        var field = input.closest(".field");
        var bad = !input.value.trim();
        if (input.type === "email" && input.value) {
          bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
        }
        if (field) field.classList.toggle("invalid", bad);
        if (bad) valid = false;
      });
      if (!valid) {
        var firstBad = form.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
        if (firstBad) firstBad.focus();
        return;
      }

      var submitBtn = form.querySelector('button[type="submit"]');
      var errorMessage = form.querySelector('.form-error');
      if (errorMessage) errorMessage.style.display = 'none';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
      }

      // Collect interests checkboxes
      var interests = [];
      form.querySelectorAll('input[name="interests"]:checked').forEach(function (cb) {
        interests.push(cb.value);
      });

      var payload = {
        name: (form.querySelector('#name') || {}).value || '',
        email: (form.querySelector('#email') || {}).value || '',
        phone: (form.querySelector('#phone') || {}).value || '',
        dates: (form.querySelector('#dates') || {}).value || '',
        travellers: (form.querySelector('#travellers') || {}).value || '',
        budget: (form.querySelector('#budget') || {}).value || '',
        interests: interests,
        message: (form.querySelector('#message') || {}).value || ''
      };

      var endpoint = form.getAttribute('action') || '/api/submit-enquiry';

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Submission failed');
          return response.json();
        })
        .then(function () {
          form.style.display = 'none';
          if (ok) {
            ok.classList.add('show');
            ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        })
        .catch(function () {
          if (errorMessage) errorMessage.style.display = 'block';
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
          }
        });
    });
    form.querySelectorAll("input,select,textarea").forEach(function (el) {
      el.addEventListener("input", function () {
        var f = el.closest(".field");
        if (f) f.classList.remove("invalid");
      });
    });
  }

  /* ============================================================
     Booking modal + Razorpay checkout
     ============================================================ */
  var modal = document.getElementById('bookingModal');
  var bookBtns = document.querySelectorAll('.btn--book');

  if (modal && bookBtns.length) {
    var closeBtn = modal.querySelector('.modal__close');
    var bookingForm = modal.querySelector('#bookingForm');
    var bookingConfirm = modal.querySelector('.booking-confirm');
    var bookingError = modal.querySelector('.booking-error');
    var itemNameEl = modal.querySelector('#modalItemName');
    var itemPriceEl = modal.querySelector('#modalItemPrice');

    var currentItem = {};

    // Open modal
    bookBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentItem = {
          name: btn.getAttribute('data-item'),
          price: parseInt(btn.getAttribute('data-price'), 10),
          type: btn.getAttribute('data-type') || 'experience'
        };
        if (itemNameEl) itemNameEl.textContent = currentItem.name;
        if (itemPriceEl) itemPriceEl.textContent = '₹' + (currentItem.price / 100).toLocaleString('en-IN');
        if (bookingForm) bookingForm.style.display = 'block';
        if (bookingConfirm) bookingConfirm.classList.remove('show');
        if (bookingError) bookingError.style.display = 'none';
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });

    // Close modal
    function closeModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });

    // Submit booking form → create order → open Razorpay
    if (bookingForm) {
      bookingForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // Validate
        var valid = true;
        bookingForm.querySelectorAll('[required]').forEach(function (input) {
          var field = input.closest('.field');
          var bad = !input.value.trim();
          if (input.type === 'email' && input.value) {
            bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
          }
          if (field) field.classList.toggle('invalid', bad);
          if (bad) valid = false;
        });
        if (!valid) return;

        var payBtn = bookingForm.querySelector('button[type="submit"]');
        if (payBtn) { payBtn.disabled = true; payBtn.classList.add('loading'); }
        if (bookingError) bookingError.style.display = 'none';

        var guests = parseInt((bookingForm.querySelector('#bookGuests') || {}).value, 10) || 1;

        var orderPayload = {
          item_name: currentItem.name,
          item_type: currentItem.type,
          amount: currentItem.price * guests,
          guests: guests,
          guest_name: (bookingForm.querySelector('#bookName') || {}).value,
          guest_email: (bookingForm.querySelector('#bookEmail') || {}).value,
          guest_phone: (bookingForm.querySelector('#bookPhone') || {}).value || '',
          travel_dates: (bookingForm.querySelector('#bookDates') || {}).value || ''
        };

        fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        })
          .then(function (r) {
            if (!r.ok) throw new Error('Order creation failed');
            return r.json();
          })
          .then(function (order) {
            // Open Razorpay Checkout
            var options = {
              key: order.key_id,
              amount: order.amount,
              currency: order.currency,
              name: 'Zaffron Valley',
              description: currentItem.name,
              order_id: order.order_id,
              prefill: {
                name: orderPayload.guest_name,
                email: orderPayload.guest_email,
                contact: orderPayload.guest_phone
              },
              theme: { color: '#E2912E' },
              handler: function (response) {
                // Verify payment
                fetch('/api/verify-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    booking_id: order.booking_id
                  })
                })
                  .then(function (r) { return r.json(); })
                  .then(function (result) {
                    if (result.verified) {
                      if (bookingForm) bookingForm.style.display = 'none';
                      if (bookingConfirm) bookingConfirm.classList.add('show');
                    } else {
                      if (bookingError) {
                        bookingError.textContent = 'Payment verification failed. Please contact us.';
                        bookingError.style.display = 'block';
                      }
                    }
                  })
                  .catch(function () {
                    if (bookingError) {
                      bookingError.textContent = 'Payment verification failed. Please contact us.';
                      bookingError.style.display = 'block';
                    }
                  });
              },
              modal: {
                ondismiss: function () {
                  if (payBtn) { payBtn.disabled = false; payBtn.classList.remove('loading'); }
                }
              }
            };
            var rzp = new Razorpay(options);
            rzp.on('payment.failed', function () {
              if (bookingError) {
                bookingError.textContent = 'Payment failed. Please try again or contact us.';
                bookingError.style.display = 'block';
              }
            });
            rzp.open();
          })
          .catch(function () {
            if (bookingError) {
              bookingError.textContent = 'Could not create order. Please try again.';
              bookingError.style.display = 'block';
            }
          })
          .finally(function () {
            if (payBtn) { payBtn.disabled = false; payBtn.classList.remove('loading'); }
          });
      });

      bookingForm.querySelectorAll('input,select').forEach(function (el) {
        el.addEventListener('input', function () {
          var f = el.closest('.field');
          if (f) f.classList.remove('invalid');
        });
      });
    }
  }

  /* ---- Footer year ---- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();
