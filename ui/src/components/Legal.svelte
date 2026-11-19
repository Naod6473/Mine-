<script lang="ts">
  // Conditions d'utilisation et confidentialité. Volontairement sans nom : chaque instance
  // de Mine!? est hébergée par la personne qui l'installe, appelée ici « l'administrateur ».
  import { app } from '../lib/state.svelte';
  import { i18n, t } from '../lib/i18n.svelte';

  let { page }: { page: 'terms' | 'privacy' } = $props();
  const SOURCE_URL = 'https://github.com/Naod6473/Mine-';
  const fr = $derived(i18n.lang === 'fr');
</script>

<article class="legal">
  {#if page === 'terms' && fr}
    <h1>Conditions d'utilisation</h1>
    <p class="date">Dernière mise à jour : 19 novembre 2026</p>

    <h2>1. Ce qu'est Mine!?</h2>
    <p>Mine!? est un logiciel libre qui récupère des vidéos, de la musique, des sous-titres ou des miniatures à partir d'un lien, puis envoie le fichier obtenu à ton navigateur. Chaque instance est installée et gérée par une personne ou un foyer, appelé ici « l'administrateur ». Il n'existe pas de service central : l'instance que tu utilises appartient à celui qui l'a installée.</p>

    <h2>2. Accepter ces conditions</h2>
    <p>En utilisant cette instance, tu acceptes les présentes conditions. Si tu ne les acceptes pas, n'utilise pas l'application.</p>

    <h2>3. Ce que tu as le droit de télécharger</h2>
    <p>Tu es seul responsable des liens que tu colles et de l'usage que tu fais des fichiers obtenus. Tu t'engages à :</p>
    <ul>
      <li>ne récupérer que des contenus que tu as le droit de copier : tes propres créations, des œuvres sous licence libre ou dans le domaine public, ou des contenus dont l'auteur autorise la copie ;</li>
      <li>respecter le droit d'auteur, les droits voisins et, en France, le cadre de la copie privée, qui ne couvre que l'usage strictement personnel d'une source licite ;</li>
      <li>respecter les conditions d'utilisation des sites dont proviennent les contenus, dont certaines interdisent le téléchargement ;</li>
      <li>ne pas partager, revendre ni diffuser publiquement les fichiers obtenus sans l'accord des ayants droit ;</li>
      <li>ne pas contourner de mesure technique de protection (DRM, contenus payants ou réservés).</li>
    </ul>

    <h2>4. Usage raisonnable</h2>
    <p>L'instance tourne sur un serveur aux ressources limitées. N'en fais pas un usage abusif (téléchargements massifs automatisés, tentatives d'accès au réseau local de l'administrateur, contournement des réglages). L'administrateur peut limiter, suspendre ou couper l'accès à tout moment, sans préavis.</p>

    <h2>5. Disponibilité</h2>
    <p>Mine!? est fourni tel quel, sans garantie de disponibilité ni de résultat. Un site peut changer et empêcher temporairement un téléchargement. Les fichiers ne sont pas conservés sur le serveur : une fois envoyés à ton navigateur, ils y sont effacés. Garde tes propres copies.</p>

    <h2>6. Responsabilité</h2>
    <p>Dans la limite permise par la loi, ni l'administrateur ni les auteurs du logiciel ne sont responsables des contenus que tu récupères, de l'usage que tu en fais, ni des dommages directs ou indirects liés à l'utilisation de l'application. Le logiciel est distribué sans aucune garantie, comme le prévoit sa licence.</p>

    <h2>7. Logiciel libre</h2>
    <p>Mine!? est distribué sous licence GNU Affero General Public License v3.0. Tu peux consulter, modifier et redistribuer son <a href={SOURCE_URL} target="_blank" rel="noreferrer">code source</a> selon les termes de cette licence. Ces conditions d'utilisation ne restreignent aucun des droits qu'elle t'accorde.</p>

    <h2>8. Modifications</h2>
    <p>Ces conditions peuvent évoluer. La date en haut de la page indique la dernière version. Continuer à utiliser l'application après une modification vaut acceptation.</p>

    <h2>9. Droit applicable</h2>
    <p>Ces conditions sont soumises au droit français, sous réserve des dispositions impératives du pays où tu résides.</p>
  {:else if page === 'terms'}
    <h1>Terms of use</h1>
    <p class="date">Last updated: 19 November 2026</p>

    <h2>1. What Mine!? is</h2>
    <p>Mine!? is free software that fetches videos, music, subtitles or thumbnails from a link, then sends the resulting file to your browser. Each instance is installed and run by a person or a household, called “the administrator” here. There is no central service: the instance you are using belongs to whoever installed it.</p>

    <h2>2. Accepting these terms</h2>
    <p>By using this instance, you accept these terms. If you do not accept them, do not use the application.</p>

    <h2>3. What you may download</h2>
    <p>You alone are responsible for the links you paste and for what you do with the files you get. You agree to:</p>
    <ul>
      <li>only fetch content you have the right to copy: your own work, works under a free licence or in the public domain, or content whose author allows copying;</li>
      <li>respect copyright and related rights, and the private-copy rules of your country, which usually only cover strictly personal use of a lawful source;</li>
      <li>respect the terms of the sites the content comes from, some of which forbid downloading;</li>
      <li>not share, resell or publicly distribute the files without the rights holders' permission;</li>
      <li>not bypass any technical protection measure (DRM, paid or restricted content).</li>
    </ul>

    <h2>4. Fair use</h2>
    <p>The instance runs on a server with limited resources. Do not abuse it (mass automated downloads, attempts to reach the administrator's local network, bypassing the settings). The administrator may limit, suspend or cut access at any time, without notice.</p>

    <h2>5. Availability</h2>
    <p>Mine!? is provided as is, with no guarantee of availability or results. A site may change and temporarily prevent a download. Files are not kept on the server: once sent to your browser, they are deleted there. Keep your own copies.</p>

    <h2>6. Liability</h2>
    <p>To the extent permitted by law, neither the administrator nor the authors of the software are liable for the content you fetch, for what you do with it, or for any direct or indirect damage linked to using the application. The software comes with no warranty, as stated in its licence.</p>

    <h2>7. Free software</h2>
    <p>Mine!? is distributed under the GNU Affero General Public License v3.0. You may read, modify and redistribute its <a href={SOURCE_URL} target="_blank" rel="noreferrer">source code</a> under the terms of that licence. These terms of use do not restrict any of the rights it grants you.</p>

    <h2>8. Changes</h2>
    <p>These terms may change. The date at the top of the page shows the latest version. Continuing to use the application after a change means you accept it.</p>

    <h2>9. Governing law</h2>
    <p>These terms are governed by French law, subject to the mandatory provisions of the country where you live.</p>
  {:else if fr}
    <h1>Confidentialité</h1>
    <p class="date">Dernière mise à jour : 19 novembre 2026</p>

    <p class="lead">En bref : pas de compte, pas de publicité, pas de mesure d'audience. Ton historique reste dans ton navigateur, et les fichiers sont effacés du serveur dès qu'ils te sont envoyés.</p>

    <h2>1. Qui est responsable</h2>
    <p>Cette instance de Mine!? est gérée par la personne qui l'a installée sur son propre serveur (l'administrateur). Les auteurs du logiciel n'ont accès à aucune donnée des instances.</p>

    <h2>2. Ce qui reste dans ton navigateur</h2>
    <p>Ces informations sont stockées uniquement sur ton appareil, dans le stockage local du navigateur. Elles ne sont jamais envoyées au serveur :</p>
    <ul>
      <li>l'historique de tes téléchargements (500 entrées au plus) : titre, lien, date, format ;</li>
      <li>tes options et préréglages, ton choix de thème jour ou nuit et ta langue ;</li>
      <li>pour l'onglet ouvert, la liste des liens que tu viens de lancer, afin de t'envoyer le bon fichier.</li>
    </ul>
    <p>Tu peux tout effacer depuis l'onglet Historique (« Tout effacer ») ou en vidant les données du site dans ton navigateur.</p>

    <h2>3. Ce que le serveur traite</h2>
    <ul>
      <li><strong>Les liens que tu colles</strong> et les options choisies, le temps du téléchargement. La liste des téléchargements récents est visible par toutes les personnes qui utilisent la même instance. Elle est effacée automatiquement après un délai fixé par l'administrateur, un jour par défaut.</li>
      <li><strong>Les fichiers obtenus</strong> : ils sont écrits temporairement sur le disque du serveur, le temps de la conversion, puis effacés dès qu'ils ont été envoyés à ton navigateur. Un fichier jamais récupéré est effacé avec la liste.</li>
      <li><strong>Un fichier de cookies</strong>, seulement si tu en envoies un (pour les contenus qui demandent une connexion). Il reste sur le serveur jusqu'à ce que tu le supprimes depuis les options. N'envoie que des cookies de comptes qui t'appartiennent.</li>
      <li><strong>Les journaux techniques</strong> du serveur, qui peuvent contenir ton adresse IP, la date et les liens demandés. Ils servent au diagnostic et restent sur le serveur de l'administrateur.</li>
    </ul>

    <h2>4. Cookies</h2>
    <p>Le serveur dépose un seul cookie technique, qui retient le thème d'affichage. Il n'y a aucun cookie de mesure d'audience, de publicité ou de réseau social, donc aucun bandeau de consentement n'est nécessaire.</p>

    <h2>5. Sites tiers</h2>
    <p>Pour récupérer un contenu, le serveur contacte le site d'origine du lien (par exemple une plateforme vidéo), qui voit alors l'adresse du serveur, pas la tienne. Les miniatures affichées dans l'application sont chargées directement par ton navigateur depuis ces sites. Les polices et l'interface sont servies par l'instance elle-même : aucune requête n'est envoyée à des services comme Google Fonts.</p>

    <h2>6. Partage et vente</h2>
    <p>Aucune donnée n'est vendue, louée ni partagée à des fins commerciales.</p>

    <h2>7. Tes droits</h2>
    <p>Conformément au RGPD, tu peux demander à l'administrateur de cette instance l'accès à tes données, leur rectification ou leur effacement, et t'opposer à leur traitement. Comme presque tout est stocké dans ton propre navigateur, tu peux exercer l'essentiel de ces droits toi-même. Tu peux aussi saisir l'autorité de protection des données de ton pays (en France, la CNIL).</p>

    <h2>8. Modifications</h2>
    <p>Cette page peut évoluer avec l'application. La date en haut indique la dernière version.</p>
  {:else}
    <h1>Privacy</h1>
    <p class="date">Last updated: 19 November 2026</p>

    <p class="lead">In short: no account, no ads, no analytics. Your history stays in your browser, and files are deleted from the server as soon as they are sent to you.</p>

    <h2>1. Who is responsible</h2>
    <p>This instance of Mine!? is run by the person who installed it on their own server (the administrator). The authors of the software have no access to any instance's data.</p>

    <h2>2. What stays in your browser</h2>
    <p>This information is stored only on your device, in the browser's local storage. It is never sent to the server:</p>
    <ul>
      <li>your download history (500 entries at most): title, link, date, format;</li>
      <li>your options and presets, your light or dark theme and your language;</li>
      <li>for the open tab, the list of links you just started, so the right file is sent to you.</li>
    </ul>
    <p>You can erase everything from the History tab (“Clear all”) or by clearing the site's data in your browser.</p>

    <h2>3. What the server handles</h2>
    <ul>
      <li><strong>The links you paste</strong> and the options you choose, for the duration of the download. The list of recent downloads is visible to everyone using the same instance. It is cleared automatically after a delay set by the administrator, one day by default.</li>
      <li><strong>The resulting files</strong>: they are written temporarily to the server's disk during conversion, then deleted as soon as they have been sent to your browser. A file that is never collected is deleted along with the list.</li>
      <li><strong>A cookie file</strong>, only if you upload one (for content that requires signing in). It stays on the server until you remove it from the options. Only upload cookies from accounts that belong to you.</li>
      <li><strong>Technical logs</strong> of the server, which may contain your IP address, the time and the links requested. They are used for troubleshooting and stay on the administrator's server.</li>
    </ul>

    <h2>4. Cookies</h2>
    <p>The server sets a single technical cookie that remembers the display theme. There are no analytics, advertising or social media cookies, so no consent banner is needed.</p>

    <h2>5. Third-party sites</h2>
    <p>To fetch content, the server contacts the site the link points to (for example a video platform), which then sees the server's address, not yours. Thumbnails shown in the application are loaded directly by your browser from those sites. Fonts and the interface are served by the instance itself: no request is sent to services such as Google Fonts.</p>

    <h2>6. Sharing and selling</h2>
    <p>No data is sold, rented or shared for commercial purposes.</p>

    <h2>7. Your rights</h2>
    <p>Under the GDPR, you can ask the administrator of this instance for access to your data, its correction or deletion, and object to its processing. Since almost everything is stored in your own browser, you can exercise most of these rights yourself. You can also contact the data protection authority of your country.</p>

    <h2>8. Changes</h2>
    <p>This page may change with the application. The date at the top shows the latest version.</p>
  {/if}

  <p class="back"><button class="textbtn strong" onclick={() => app.go('mine')}>{t('back')}</button></p>
</article>

<style>
  .legal { padding: 36px 0 8px; line-height: 1.65; }
  h1 { font-family: var(--display); font-weight: 600; font-size: 30px; margin: 0 0 4px; letter-spacing: -.01em; }
  .date { margin: 0 0 28px; color: var(--muted); font-size: 13px; }
  .lead { font-size: 16px; padding: 14px 18px; border-radius: 14px; background: var(--wash); }
  h2 { font-size: 15px; font-weight: 600; margin: 30px 0 6px; }
  p, li { color: color-mix(in oklab, var(--ink) 86%, var(--muted)); }
  ul { padding-left: 20px; margin: 8px 0; }
  li { margin: 6px 0; }
  a { color: var(--sea); }
  .back { margin-top: 36px; }
</style>
