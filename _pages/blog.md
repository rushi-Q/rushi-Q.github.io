---
permalink: /blog/
title: "Blog"
excerpt: "Notes written late — on self-improving AI, agents, and the machinery underneath."
author_profile: true
---

<div class="blog-index">

  <header class="blog-index__head">
    <h1 class="blog-index__title">{{ site.blog.title | default: "Blog" }}</h1>
    <p class="blog-index__epigraph">I write at night to document my thoughts.</p>
  </header>

  {% if site.posts.size > 0 %}

  {% assign posts_by_year = site.posts | group_by_exp: "post", "post.date | date: '%Y'" %}
  {% for year in posts_by_year %}
  <section class="blog-year">
    <h2 class="blog-year__label">{{ year.name }}</h2>

    <ul class="post-list">
      {% for post in year.items %}
      <li class="post-list__item">
        <div class="post-list__head">
          {% if post.external %}
          <a class="post-list__link" href="{{ post.external }}">{{ post.title }}<span class="post-list__ext" aria-hidden="true">&#8599;</span></a>
          {% else %}
          <a class="post-list__link" href="{{ post.url | relative_url }}" target="_self">{{ post.title }}</a>
          {% endif %}
          <span class="post-list__date">{{ post.date | date: "%b %-d" }}</span>
        </div>

        {% assign blurb = post.subtitle | default: post.summary | default: post.excerpt %}
        {% if blurb %}
        <p class="post-list__excerpt">{{ blurb | strip_html | strip_newlines | truncate: 190 }}</p>
        {% endif %}

        <p class="post-list__meta">
          {% if post.tags.size > 0 %}{% for tag in post.tags %}<span class="post-tag">{{ tag }}</span>{% endfor %}<span class="post-list__sep">&middot;</span>{% endif %}{% if post.external %}{{ post.source | default: "elsewhere" }}{% else %}{% include reading-time.html post=post %} min read{% endif %}
        </p>
      </li>
      {% endfor %}
    </ul>
  </section>
  {% endfor %}

  {% endif %}

</div>
