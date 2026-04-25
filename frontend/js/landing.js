document.addEventListener('DOMContentLoaded', () => {
  const audienceButtons = Array.from(document.querySelectorAll('#landing-clarify-audience button'));
  const clarifyTitle = document.getElementById('clarify-preview-title');
  const clarifyText = document.getElementById('clarify-preview-text');
  const briefSection = document.querySelector('.landing-section-reverse');
  const briefStages = [
    document.getElementById('brief-stage-1'),
    document.getElementById('brief-stage-2'),
    document.getElementById('brief-stage-3'),
  ];
  const heroStartBtn = document.getElementById('hero-start-btn');
  const heroBriefBtn = document.getElementById('hero-brief-btn');
  let briefFlowStarted = false;

  const clarifyContent = {
    junior: {
      title: 'Simplified + Hinglish',
      text: 'Simple: agar payment fail ho, retry karo with same key.<br>Duplicate charge avoid hota hai.<br>Backoff use hota hai retry ke beech.<br>System safe rehta hai even if retry multiple times.',
    },
    senior: {
      title: 'Senior Dev Output',
      text: 'Retries use exponential backoff with idempotency keys.<br>Ensures safe replays without duplicate charge.<br>Failure scenarios are handled deterministically.',
    },
    nontechnical: {
      title: 'Non-Technical Output',
      text: 'If a payment fails, the system retries it safely.<br>This prevents duplicate charges and ensures the payment eventually completes.<br>Everything happens automatically in the background.',
    },
  };

  audienceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      audienceButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      const audience = button.dataset.audience || 'junior';
      const next = clarifyContent[audience];
      if (!clarifyText || !clarifyTitle || !next) return;

      clarifyText.classList.add('is-fading');
      setTimeout(() => {
        clarifyTitle.textContent = next.title;
        clarifyText.innerHTML = next.text;
        clarifyText.classList.remove('is-fading');
      }, 120);
    });
  });

  heroStartBtn?.addEventListener('click', () => {
    window.location.href = '/transform.html';
  });
  heroBriefBtn?.addEventListener('click', () => {
    window.location.href = '/brief.html';
  });

  const revealSections = document.querySelectorAll('.reveal-section');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        if (!briefFlowStarted && briefSection && entry.target === briefSection) {
          briefFlowStarted = true;
          runBriefFlow(briefStages);
        }
      }
    });
  }, { threshold: 0.15 });

  revealSections.forEach((section) => observer.observe(section));
});

function runBriefFlow(stages) {
  stages.forEach((stage) => stage?.classList.remove('active'));
  const [step1, step2, step3] = stages;
  step1?.classList.add('active');
  setTimeout(() => {
    step1?.classList.remove('active');
    step2?.classList.add('active');
  }, 1200);
  setTimeout(() => {
    step2?.classList.remove('active');
    step3?.classList.add('active');
  }, 2400);
}
