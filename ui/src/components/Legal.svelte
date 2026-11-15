<script lang="ts">
  // Conditions d'utilisation et confidentialité. Volontairement sans nom : chaque instance
  // de Mine!? est hébergée par la personne qui l'installe, appelée ici « l'administrateur ».
  import { app } from '../lib/state.svelte';

  let { page }: { page: 'terms' | 'privacy' } = $props();
  const SOURCE_URL = 'https://github.com/Naod6473/Mine-';
  const updated = '15 novembre 2026';
</script>

<article class="legal">
  {#if page === 'terms'}
    <h1>Conditions d'utilisation</h1>
    <p class="date">Dernière mise à jour : {updated}</p>

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
  {:else}
    <h1>Confidentialité</h1>
    <p class="date">Dernière mise à jour : {updated}</p>

    <p class="lead">En bref : pas de compte, pas de publicité, pas de mesure d'audience. Ton historique reste dans ton navigateur, et les fichiers sont effacés du serveur dès qu'ils te sont envoyés.</p>

    <h2>1. Qui est responsable</h2>
    <p>Cette instance de Mine!? est gérée par la personne qui l'a installée sur son propre serveur (l'administrateur). Les auteurs du logiciel n'ont accès à aucune donnée des instances.</p>

    <h2>2. Ce qui reste dans ton navigateur</h2>
    <p>Ces informations sont stockées uniquement sur ton appareil, dans le stockage local du navigateur. Elles ne sont jamais envoyées au serveur :</p>
    <ul>
      <li>l'historique de tes téléchargements (500 entrées au plus) : titre, lien, date, format ;</li>
      <li>tes options et préréglages, ton choix de thème jour ou nuit ;</li>
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
  {/if}

  <p class="back"><button class="textbtn strong" onclick={() => app.go('mine')}>Retour à Mine!?</button></p>
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
