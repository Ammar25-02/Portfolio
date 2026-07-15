// Data-driven rendering for the portfolio.
// Reads data/projects.json, data/skills.json, data/experience.json and
// rebuilds the same markup the page used to hard-code, so style.css and
// the existing design apply unchanged. Also fills the optional
// "Latest on GitHub" section from the GitHub API.

(function () {
  'use strict';

  // script.js only observes .reveal elements that exist at load time, so
  // dynamically rendered cards need their own observer (same settings).
  var revealObserver = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (entries, io) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 })
    : null;

  function observeReveals(container) {
    container.querySelectorAll('.reveal').forEach(function (el) {
      if (revealObserver) revealObserver.observe(el);
      else el.classList.add('visible');
    });
  }

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
      return '<span>' + esc(t) + '</span>';
    }).join('');
    // Placeholder links ("#") are hidden until a real URL is filled in.
    var links = (p.links || []).filter(function (l) {
      return l.url && l.url !== '#';
    }).map(function (l) {
      return '<a href="' + esc(l.url) + '" class="btn small' + (l.outline ? ' outline' : '') + '">' + esc(l.label) + '</a>';
    }).join('');
    // The gradient layer shows through when the image is missing.
    return '<article class="project-card reveal" tabindex="0">' +
      '<div class="project-media" style="background: url(\'' + esc(p.image) + '\') center/cover no-repeat, linear-gradient(135deg, rgba(123,123,255,0.28), rgba(11,16,32,0.9));">' +
        '<div class="tag">' + esc(p.badge) + '</div>' +
      '</div>' +
      '<div class="project-body">' +
        '<h3>' + esc(p.title) + '</h3>' +
        '<p>' + esc(p.desc) + '</p>' +
        '<div class="project-meta">' + tags + '</div>' +
        '<div class="project-actions">' + links + '</div>' +
      '</div>' +
    '</article>';
  }

  function renderProjects() {
    var grid = document.getElementById('projects-grid');
    if (!grid) return Promise.resolve();
    return fetchJSON('data/projects.json').then(function (projects) {
      grid.innerHTML = projects.map(projectCard).join('');
      openPdfsInNewTab(grid);
      observeReveals(grid);
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
      var html = '<h3>Education</h3>';
      html += (data.education || []).map(function (e) {
        return '<p><strong>' + esc(e.institution) + '</strong> — ' + esc(e.degree) + '<br>' + esc(e.note) + '</p>';
      }).join('');
      html += '<hr />';
      html += '<h3>Experience</h3>';
      html += (data.experience || []).map(function (e) {
        return '<p><strong>' + esc(e.role) + '</strong> — ' + esc(e.company) + ' (' + esc(e.period) + ')</p>';
      }).join('');
      box.innerHTML = html;
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
          return '<article class="project-card reveal" tabindex="0">' +
            '<div class="project-body">' +
              '<h3>' + esc(repo.name) + '</h3>' +
              '<p>' + esc(repo.description || 'No description yet.') + '</p>' +
              '<div class="project-actions">' +
                '<a href="' + esc(repo.html_url) + '" class="btn small" target="_blank" rel="noopener noreferrer">View Repo</a>' +
              '</div>' +
            '</div>' +
          '</article>';
        }).join('');
        section.removeAttribute('hidden');
        observeReveals(grid);
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
