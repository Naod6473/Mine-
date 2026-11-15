// Jour / nuit : suit le système par défaut, bascule à la main, toujours avec un fondu doux.
type Choice = 'auto' | 'light' | 'dark';
const KEY = 'mine.theme';
const media = matchMedia('(prefers-color-scheme: dark)');

function read(): Choice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

class Theme {
  choice = $state<Choice>(read());
  system = $state<'light' | 'dark'>(media.matches ? 'dark' : 'light');
  current = $derived(this.choice === 'auto' ? this.system : this.choice);

  constructor() {
    media.addEventListener('change', (e) => fade(() => (this.system = e.matches ? 'dark' : 'light')));
    $effect.root(() => {
      $effect(() => {
        document.documentElement.dataset.theme = this.current;
        document.querySelector('meta[name=theme-color]:not([media])')?.setAttribute('content', this.current === 'dark' ? '#0E1215' : '#F7F9FA');
      });
    });
  }

  toggle() {
    const next = this.current === 'dark' ? 'light' : 'dark';
    // Revenir au thème du système, c'est revenir en automatique.
    const choice: Choice = next === this.system ? 'auto' : next;
    fade(() => (this.choice = choice));
    try {
      if (choice === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch {}
  }
}

/** Applique le changement dans un fondu enchaîné de toute la page. */
function fade(change: () => void) {
  const root = document.documentElement;
  const apply = () => {
    change();
    root.dataset.theme = theme.current;
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return apply();
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition) {
    doc.startViewTransition(apply);
    return;
  }
  // Repli : transitions de couleur pendant le changement.
  root.classList.add('theming');
  apply();
  setTimeout(() => root.classList.remove('theming'), 700);
}

export const theme = new Theme();
