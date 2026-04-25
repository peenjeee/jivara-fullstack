"use client";

/**
 * Initializes intersection observer animations for elements with [data-animate] attribute.
 * This is used for reveal-on-scroll effects on the landing page.
 */
export const initScrollAnimations = () => {
  if (typeof window === "undefined") return;

  document.documentElement.classList.add('js-ready');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  }, { 
    threshold: 0.1, 
    rootMargin: "0px 0px -50px 0px" 
  });

  document.querySelectorAll('article').forEach((el, i) => {
    const article = el as HTMLElement;
    article.setAttribute('data-animate', 'true');
    article.style.setProperty('--reveal-delay', (i * 100) + 'ms');
    observer.observe(article);
  });

  return () => observer.disconnect();
};
