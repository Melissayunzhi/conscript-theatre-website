# Conscript Theatre website

Plain HTML, CSS and JS, built by GitHub Pages (Jekyll) and edited through Pages CMS.

```
_layouts/        page templates (home, about, projects, team, contact, show)
_includes/       header, footer, video embed, gallery, ambient sound player
_shows/          one file per show → /projects/<file-name>/
_data/           settings.yml (email, socials, ambient sound…), navigation.yml
index.md, about.md, projects.md, team.md, contact.md   page content (front matter only)
assets/css/style.css   all styling; colours and sizes are variables at the top
assets/js/main.js      menu, slideshow, lightbox, team hover, showreel, ambient sound
.pages.yml       what Conscript sees in Pages CMS
redirect-site/   tiny separate site for the old domain (see below)
tools/pull-wix-images.sh   copies the Wix-hosted images into this repo
```

## 1. Put it on GitHub Pages

1. Create a repo (e.g. `conscript-theatre/website`) and push this folder to `main`.
2. Repo → Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. It goes live at `https://<account>.github.io/<repo>/`. While testing on that address, set `baseurl: "/<repo>"` in `_config.yml`; set it back to `""` once the custom domain is on.

## 2. The last few files on Wix

All photos, logos, page sounds and the Surely trailer from Elia's asset pack are already in `assets/` (resized for the web, location data stripped).
Still loading from Wix: the custom heading font, and the three URS video clips + development-history images.
Before cancelling Wix, on your own computer:

```
bash tools/pull-wix-images.sh
git add -A && git commit -m "Move last files off Wix" && git push
```

Fonts: Jost (main text, Google's version of Futura), Cormorant Garamond (values, Surely title), Questrial (eco 40-60° title, standing in for Wix's "Aether"), and Conscript's own uploaded heading font. Check that font's licence allows self-hosting.

## 3. Pages CMS (editing without code)

1. Go to app.pagescms.org, sign in with GitHub, open the repo.
2. Everything in `.pages.yml` appears as forms: Shows, Homepage, About, Projects, Meet the Team, Contact, Site settings, Menu.
3. Give Conscript access (add them as collaborators on the repo, or use Pages CMS's own collaborator invites).
4. Each Save commits to GitHub; the live site updates about a minute later.

Things they can do there:
- **Add a show**: Shows → new entry. Status `current` puts it at the top of Projects and on the homepage.
- **Showreel**: Homepage → paste a YouTube/Vimeo link, or upload an .mp4 (keep under 50 MB; GitHub rejects files over 100 MB). Plays muted on loop.
- **Page sounds**: About, Projects, Meet the Team and the URS page each have their own track next to the heading, like on Wix ("Sound next to heading").
- **Ambient sound (optional)**: Site settings → upload an .mp3 for a site-wide "sound on" button that keeps playing across pages.
- **Team hover**: add a "Second photo" to a member and it swaps in on hover/tap. Without one, the photo flickers to black-and-white with scanlines.
- **Reorder About paragraphs**: About page → drag the sections.

## 4. Domains

**New domain (conscripttheatre.com)**: buy it at a registrar (Porkbun, Namecheap…). Add DNS:
- `A` records for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- `CNAME` for `www` → `<account>.github.io`

Then repo → Settings → Pages → Custom domain: `conscripttheatre.com`, tick **Enforce HTTPS**. (The `CNAME` file in this repo already says `conscripttheatre.com`.)

**Old domain (conscript-theatre.com, at Wix)**: GitHub Pages allows one domain per repo, so the old domain gets its own tiny repo:
1. Create a second repo, push the contents of `redirect-site/` to it, enable Pages the same way.
2. In Wix → Domains → conscript-theatre.com → DNS: set the same four `A` records for `@`, and `CNAME` `www` → `<account>.github.io`.
3. In that repo's Pages settings, custom domain `www.conscript-theatre.com`.

Every old Wix address forwards to its new page:

| Old | New |
|---|---|
| /about-1 | /about/ |
| /about | /team/ |
| /projects | /projects/ |
| /contact-8 | /contact/ |
| /eco-40-60 | /projects/eco-40-60/ |
| /surely-some-revelation | /projects/surely-some-revelation/ |
| anything else | homepage |

These are instant browser redirects with canonical tags, which search engines follow. GitHub Pages can't send true 301s; if the old domain later moves to a registrar with URL forwarding (or Cloudflare), switch to 301s there.

## 5. Contact form

Wix's form doesn't come with us. The contact page shows email and Instagram. To bring a form back, make a free Formspree form and paste its URL into Site settings → Contact form endpoint.

## Preview locally (optional)

```
bundle install
bundle exec jekyll serve
```
