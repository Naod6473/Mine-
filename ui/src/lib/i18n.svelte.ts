// Deux langues. En français, la mouette crie « À moi ! » ; en anglais, « Mine! ».
// Le nom de l'app reste « Mine!? » partout.
export type Lang = 'fr' | 'en';
const KEY = 'mine.lang';

const fr = {
  cry: 'À moi !', busy: 'À moi…', pct: 'À moi… {n} %', almost: 'À moi… presque', ask: 'À moi ?', nope: 'Pas à toi.',
  chorus: 'À moi ! À moi ! À moi !', titleBusy: '({n}) À moi… · Mine!?',
  tabMine: 'À moi', tabHistory: 'Historique', home: 'Mine!?, accueil', sections: 'Sections',
  toDay: 'Passer en mode jour', toNight: 'Passer en mode nuit', day: 'Mode jour', night: 'Mode nuit',
  switchLang: 'Switch to English', langShort: 'EN',
  offline: 'Le serveur ne répond plus, je réessaie…', active: 'En cours', recent: 'Récemment', tidyAll: 'Tout ranger',
  terms: "Conditions d'utilisation", privacy: 'Confidentialité', source: 'Code source', close: 'Fermer',
  linkLabel: 'Lien à télécharger', clear: 'Vider le champ', options: 'Options', hideOptions: 'Masquer les options', presets: 'Préréglages',
  start: 'Lancer', cancel: 'Annuler', fetch: 'Récupérer', dismiss: 'Ranger', retry: 'Réessayer',
  paused: 'En pause', queued: 'En file', reading: 'Lecture du lien', converting: 'Conversion du fichier', waiting: 'En attente d’une place libre',
  sentAgain: 'Relancé. À moi !',
  advanced: 'Options avancées', loadingOptions: 'Chargement des options…', type: 'Type', format: 'Format', quality: 'Qualité',
  codec: 'Codec', tags: 'Tags', language: 'Langue', subtitles: 'Sous-titres', folder: 'Dossier', root: 'Racine',
  playlist: 'Playlist', all: 'Tout', thisVideo: 'Cette vidéo', limit: 'Limiter', itemCount: "Nombre d'éléments", firstItems: 'premiers éléments',
  clipStart: "Début de l'extrait", clipEnd: "Fin de l'extrait", end: 'fin', prefix: 'Préfixe du nom', none: 'aucun',
  chapters: 'Un fichier par chapitre', sponsor: 'Sauter les passages sponsorisés',
  cookies: 'Cookies', cookieSet: 'Fichier en place', cookieNone: 'Aucun', replace: 'Remplacer', sendFile: 'Envoyer un fichier', remove: 'Supprimer',
  cookiesSaved: 'Cookies enregistrés.', cookiesRefused: 'Pas à toi. Le fichier de cookies a été refusé.', cookiesRemoved: 'Cookies supprimés.',
  presetName: 'Nom du préréglage', save: 'Enregistrer', presetSaved: 'Préréglage « {n} » enregistré.', removeX: 'Supprimer {n}',
  reset: 'Revenir aux réglages par défaut',
  search: 'Rechercher un titre ou un site', searchLabel: "Rechercher dans l'historique", filter: 'Filtrer', ok: 'Réussis', failed: 'Échoués',
  emptyTitle: "Rien dans le bec pour l'instant.", emptyText: 'Les téléchargements terminés apparaissent ici, dans ce navigateur uniquement.',
  noMatch: 'Rien ne correspond.', file: 'Fichier', fileTitle: 'Récupérer le fichier', again: 'Relancer', againTitle: 'Relancer avec les mêmes options',
  copy: 'Copier', copyTitle: "Copier le lien d'origine", removeHistory: "Retirer de l'historique", removeShort: 'Retirer',
  copied: 'Lien copié.', copyFailed: 'Copie impossible ici : le lien est {n}', imported: '{n} entrée(s) ajoutée(s).',
  badImport: 'Pas à toi. Ce fichier n’est pas un historique Mine!?.', kept: 'Gardé dans ce navigateur, 500 entrées maximum.',
  export: 'Exporter', import: 'Importer', sure: 'Sûr ? Cliquer encore', clearAll: 'Tout effacer', exportName: 'mine-historique',
  today: "Aujourd'hui, {n}", yesterday: 'Hier, {n}', left: 'reste {n}', back: 'Retour à Mine!?',
};
type Dict = typeof fr;

const en: Dict = {
  cry: 'Mine!', busy: 'Mine…', pct: 'Mine… {n}%', almost: 'Mine… almost', ask: 'Mine?', nope: 'Not yours.',
  chorus: 'Mine! Mine! Mine!', titleBusy: '({n}) Mine… · Mine!?',
  tabMine: 'Mine', tabHistory: 'History', home: 'Mine!?, home', sections: 'Sections',
  toDay: 'Switch to light mode', toNight: 'Switch to dark mode', day: 'Light mode', night: 'Dark mode',
  switchLang: 'Passer en français', langShort: 'FR',
  offline: 'The server stopped answering, retrying…', active: 'In progress', recent: 'Recent', tidyAll: 'Clear all',
  terms: 'Terms of use', privacy: 'Privacy', source: 'Source code', close: 'Close',
  linkLabel: 'Link to download', clear: 'Clear the field', options: 'Options', hideOptions: 'Hide options', presets: 'Presets',
  start: 'Start', cancel: 'Cancel', fetch: 'Get file', dismiss: 'Clear', retry: 'Retry',
  paused: 'Paused', queued: 'Queued', reading: 'Reading the link', converting: 'Converting the file', waiting: 'Waiting for a free slot',
  sentAgain: 'Sent again. Mine!',
  advanced: 'Advanced options', loadingOptions: 'Loading options…', type: 'Type', format: 'Format', quality: 'Quality',
  codec: 'Codec', tags: 'Tags', language: 'Language', subtitles: 'Subtitles', folder: 'Folder', root: 'Root',
  playlist: 'Playlist', all: 'All', thisVideo: 'This video', limit: 'Limit', itemCount: 'Number of items', firstItems: 'first items',
  clipStart: 'Clip start', clipEnd: 'Clip end', end: 'end', prefix: 'Name prefix', none: 'none',
  chapters: 'One file per chapter', sponsor: 'Skip sponsored segments',
  cookies: 'Cookies', cookieSet: 'File in place', cookieNone: 'None', replace: 'Replace', sendFile: 'Upload a file', remove: 'Remove',
  cookiesSaved: 'Cookies saved.', cookiesRefused: 'Not yours. The cookie file was refused.', cookiesRemoved: 'Cookies removed.',
  presetName: 'Preset name', save: 'Save', presetSaved: 'Preset “{n}” saved.', removeX: 'Remove {n}',
  reset: 'Back to default settings',
  search: 'Search a title or a site', searchLabel: 'Search history', filter: 'Filter', ok: 'Done', failed: 'Failed',
  emptyTitle: 'Nothing in the beak yet.', emptyText: 'Finished downloads show up here, in this browser only.',
  noMatch: 'Nothing matches.', file: 'File', fileTitle: 'Get the file', again: 'Again', againTitle: 'Run again with the same options',
  copy: 'Copy', copyTitle: 'Copy the original link', removeHistory: 'Remove from history', removeShort: 'Remove',
  copied: 'Link copied.', copyFailed: 'Copy not possible here: the link is {n}', imported: '{n} entry(ies) added.',
  badImport: 'Not yours. This file is not a Mine!? history.', kept: 'Kept in this browser, 500 entries at most.',
  export: 'Export', import: 'Import', sure: 'Sure? Click again', clearAll: 'Clear all', exportName: 'mine-history',
  today: 'Today, {n}', yesterday: 'Yesterday, {n}', left: '{n} left', back: 'Back to Mine!?',
};

const DICTS: Record<Lang, Dict> = { fr, en };

function initial(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'fr' || v === 'en') return v;
  } catch {}
  return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

class I18n {
  lang = $state<Lang>(initial());
  locale = $derived(this.lang === 'fr' ? 'fr-FR' : 'en-GB');

  constructor() {
    $effect.root(() => {
      $effect(() => { document.documentElement.lang = this.lang; });
    });
  }

  toggle() {
    this.lang = this.lang === 'fr' ? 'en' : 'fr';
    try { localStorage.setItem(KEY, this.lang); } catch {}
  }
}

export const i18n = new I18n();

/** Texte traduit ; `{n}` est remplacé par la valeur donnée. */
export function t(key: keyof Dict, n?: string | number): string {
  const s = DICTS[i18n.lang][key];
  return n == null ? s : s.replace('{n}', String(n));
}
