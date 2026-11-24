// Data-driven rendering for the portfolio.
// Reads data/projects.json, data/skills.json, data/experience.json and
// renders the project index, the record and the GitHub rail, so style.css
// styles them like the rest of the page. Also fills the optional
// "Latest on GitHub" section from the GitHub API.

(function () {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function fetchJSON(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error(url + ' -> ' + res.status);
      return res.json();
    });
  }

  // script.js applies this to static links at load time; do the same for
  // links rendered after that pass.
  function openPdfsInNewTab(container) {
    container.querySelectorAll('a[href$=".pdf"]').forEach(function (a) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  }

  // ----- Projects -----
  function projectCard(p) {
    var tags = (p.tags || []).map(function (t) {
      return '<li>' + esc(t) + '</li>';
    }).join('');
    // Placeholder links ("#") are hidden until a real URL is filled in.
    var links = (p.links || []).filter(function (l) {
      return l.url && l.url !== '#';
    }).map(function (l) {
      return '<a href="' + esc(l.url) + '" class="text-link">' + esc(l.label) + '</a>';
    }).join('');
    // A missing image is dropped by the slot script and its cell collapses.
    var media = p.image
      ? '<figure class="index-photo" data-slot="project" data-alt="' + esc(p.title) + '">' +
          '<img src="' + esc(p.image) + '" alt="" loading="lazy" width="320" height="240">' +
        '</figure>'
      : '';
    return '<li class="index-row">' +
      '<div class="index-main">' +
        '<h3>' + esc(p.title) + '</h3>' +
        '<p class="index-kind">' + esc(p.badge) + '</p>' +
      '</div>' +
      '<div class="index-detail">' +
        '<p>' + esc(p.desc) + '</p>' +
        '<ul class="tags" aria-label="Built with">' + tags + '</ul>' +
        (links ? '<div class="index-links">' + links + '</div>' : '') +
      '</div>' +
      media +
    '</li>';
  }

  // Same rule as the slot script in index.html, for images added later.
  function dropBrokenImages(container) {
    container.querySelectorAll('[data-slot] img').forEach(function (img) {
      if (img.complete && !img.naturalWidth) img.remove();
      else img.addEventListener('error', function () { img.remove(); }, { once: true });
    });
  }

  function renderProjects() {
    var grid = document.getElementById('projects-grid');
    if (!grid) return Promise.resolve();
    return fetchJSON('data/projects.json').then(function (projects) {
      grid.innerHTML = projects.map(projectCard).join('');
      dropBrokenImages(grid);
      openPdfsInNewTab(grid);
    });
  }

  // ----- Skills -----
  function renderSkills() {
    var wrap = document.getElementById('skills');
    if (!wrap) return Promise.resolve();
    return fetchJSON('data/skills.json').then(function (skills) {
      var pill = function (s) { return '<span class="skill">' + esc(s) + '</span>'; };
      if (skills.length && typeof skills[0] === 'string') {
        // Flat list of skill names
        wrap.innerHTML = '<div class="skill-pill-wrap">' + skills.map(pill).join('') + '</div>';
      } else {
        // Grouped: [{category, items: [...]}]
        wrap.innerHTML = skills.map(function (group) {
          return '<div class="skill-group">' +
            '<h4 class="skill-group-title">' + esc(group.category) + '</h4>' +
            '<div class="skill-pill-wrap">' + (group.items || []).map(pill).join('') + '</div>' +
          '</div>';
        }).join('');
      }
    });
  }

  // ----- Education / Experience -----
  function renderExperience() {
    var box = document.getElementById('resume-entries');
    if (!box) return Promise.resolve();
    return fetchJSON('data/experience.json').then(function (data) {
      var row = function (when, title, where) {
        return '<li class="entry"><span class="entry-when">' + esc(when) + '</span>' +
          '<span class="entry-what"><strong>' + esc(title) + '</strong> ' + esc(where) + '</span></li>';
      };
      var html = '<h3>Experience</h3><ol class="entry-list">';
      html += (data.experience || []).map(function (e) {
        return row(e.period, e.role, e.company);
      }).join('');
      html += '</ol><h3>Education</h3><ol class="entry-list">';
      html += (data.education || []).map(function (e) {
        return row(e.note, e.degree, e.institution);
      }).join('');
      box.innerHTML = html + '</ol>';
    });
  }

  // ----- Latest on GitHub -----
  function renderGitHub() {
    var section = document.getElementById('github');
    var grid = document.getElementById('github-grid');
    if (!section || !grid) return Promise.resolve();
    return fetchJSON('https://api.github.com/users/ammar25-02/repos?sort=updated&per_page=30')
      .then(function (repos) {
        if (!Array.isArray(repos)) return;
        // Original work only: skip forks and the portfolio repo itself.
        repos = repos.filter(function (repo) {
          return !repo.fork && repo.name.toLowerCase() !== 'mrammar2.github.io';
        }).slice(0, 6);
        if (repos.length === 0) return;
        grid.innerHTML = repos.map(function (repo) {
          return '<li class="cell repo">' +
            '<h3>' + esc(repo.name) + '</h3>' +
            '<p>' + esc(repo.description || 'No description yet.') + '</p>' +
            '<a href="' + esc(repo.html_url) + '" class="text-link" target="_blank" rel="noopener noreferrer">View Repo</a>' +
          '</li>';
        }).join('');
        section.removeAttribute('hidden');
      });
  }

  function updateFooterYear() {
    var year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function init() {
    updateFooterYear();
    // Each renderer fails independently: a broken/missing file leaves its
    // container empty (and the GitHub section hidden) without breaking the page.
    [renderProjects, renderSkills, renderExperience, renderGitHub].forEach(function (render) {
      render().catch(function (err) {
        console.warn('render.js:', err);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
