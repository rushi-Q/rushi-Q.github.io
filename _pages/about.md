---
permalink: /
title: ""
excerpt: ""
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

{% if site.google_scholar_stats_use_cdn %}
{% assign gsDataBaseUrl = "https://cdn.jsdelivr.net/gh/" | append: site.repository | append: "@" %}
{% else %}
{% assign gsDataBaseUrl = "https://raw.githubusercontent.com/" | append: site.repository | append: "/" %}
{% endif %}
{% assign url = gsDataBaseUrl | append: "google-scholar-stats/gs_data_shieldsio.json" %}

<span class='anchor' id='about-me'></span>

<div class="intro" markdown="1">

I study how models can improve models: building the environments, algorithms, infrastructure, and harnesses through which language models take part in constructing their successors.

I am a second-year Ph.D. student in Machine Learning at Georgia Tech, co-advised by [Bo Dai](https://bo-dai.github.io/) and [Chao Zhang](http://chaozhang.org/), and currently a Student Researcher at Google DeepMind in Mountain View, where I work on agentic MLE for Gemini. Before Georgia Tech, I received my B.Eng. in Automation from Tsinghua University as a member of its AGI Pilot Class (TONG Class).

I welcome conversations about research, collaboration, and opportunities: reach me at [rqiang6@gatech.edu](mailto:rqiang6@gatech.edu).

</div>


# Research

My research aims at <em>self-improving AI</em>, organized as a stack in which every layer has to hold:

<ul class="research-list">
  <li><span class="research-topic">Data &amp; Environments.</span> Interactive playgrounds where agents run the real experiment loop, and automated pipelines that manufacture verifiable tasks at scale (<a href="https://arxiv.org/abs/2505.07782">MLE-Dojo</a>, <a href="https://arxiv.org/abs/2510.07307">MLE-Smith</a>).</li>
  <li><span class="research-topic">Algorithms.</span> Post-training that stays dense, reliable, and on-policy over long horizons (<a href="https://arxiv.org/abs/2605.12913">Agent DAgger</a>).</li>
  <li><span class="research-topic">Infrastructure.</span> Modular systems that schedule and scale agentic reinforcement learning (<a href="https://github.com/StACx-StandAloneComplex/stacx">STACX</a>).</li>
  <li><span class="research-topic">Harnesses.</span> Hierarchical orchestration that sustains long-horizon optimization and research, keeping exploration coherent as contexts grow.</li>
</ul>

The long-term goal is <em>LLM for LLM</em>: language models building the systems that build language models, grounded in verifiable, real-world engineering.


# Publications &amp; Preprints

<ul class="pub-list">
  <li class="pub">
    <span class="pub-venue">ICLR 2026</span>
    <span class="pub-title"><a href="https://arxiv.org/abs/2510.07307">MLE-Smith: Scaling MLE Tasks with Automated Multi-Agent Pipeline</a></span>
    <span class="pub-authors"><span class="me">Rushi Qiang</span>, Yuchen Zhuang, Anikait Singh, Percy Liang, Chao Zhang, Sherry Yang, Bo Dai</span>
  </li>
  <li class="pub">
    <span class="pub-venue">NeurIPS 2025 &middot; Datasets &amp; Benchmarks</span>
    <span class="pub-title"><a href="https://arxiv.org/abs/2505.07782">MLE-Dojo: Interactive Environments for Empowering LLM Agents in Machine Learning Engineering</a></span>
    <span class="pub-authors"><span class="me">Rushi Qiang</span><sup>*</sup>, Yuchen Zhuang<sup>*</sup>, Yinghao Li, Dingu Sagar V K, Rongzhi Zhang, Changhao Li, Ian Shu-Hei Wong, Sherry Yang, Percy Liang, Chao Zhang, Bo Dai</span>
  </li>
  <li class="pub">
    <span class="pub-venue">NeurIPS 2025</span>
    <span class="pub-title"><a href="https://arxiv.org/abs/2410.20749">Matryoshka Pilot: Learning to Drive Black-Box LLMs with LLMs</a></span>
    <span class="pub-authors">Changhao Li<sup>*</sup>, Yuchen Zhuang<sup>*</sup>, <span class="me">Rushi Qiang</span>, Haotian Sun, Hanjun Dai, Chao Zhang, Bo Dai</span>
  </li>
  <li class="pub">
    <span class="pub-venue">COLM 2025</span>
    <span class="pub-title"><a href="https://arxiv.org/abs/2503.19168">Language Model Uncertainty Quantification with Attention Chain</a></span>
    <span class="pub-authors">Yinghao Li, <span class="me">Rushi Qiang</span>, Lama Moukheiber, Chao Zhang</span>
  </li>
  <li class="pub">
    <span class="pub-venue">NeurIPS 2024</span>
    <span class="pub-title"><a href="https://arxiv.org/abs/2406.02888">HYDRA: Model Factorization Framework for Black-Box LLM Personalization</a></span>
    <span class="pub-authors">Yuchen Zhuang, Haotian Sun, Yue Yu, <span class="me">Rushi Qiang</span>, Qifan Wang, Chao Zhang, Bo Dai</span>
  </li>
  <li class="pub">
    <span class="pub-venue">NAACL 2024</span>
    <span class="pub-title"><a href="https://arxiv.org/abs/2403.09113">AutoLoRA: Automatically Tuning Matrix Ranks in Low-Rank Adaptation Based on Meta Learning</a></span>
    <span class="pub-authors">Ruiyi Zhang<sup>*</sup>, <span class="me">Rushi Qiang</span><sup>*</sup>, Sai Ashish Somayajula, Pengtao Xie</span>
  </li>
  <li class="pub">
    <span class="pub-venue">arXiv &middot; 2026</span>
    <span class="pub-title"><a href="https://arxiv.org/abs/2605.12913">Revisiting DAgger in the Era of LLM-Agents</a></span>
    <span class="pub-authors">Changhao Li, <span class="me">Rushi Qiang</span><sup>&dagger;</sup>, Jiawei Huang<sup>&dagger;</sup>, Chenxiao Gao<sup>&dagger;</sup>, Chao Zhang, Niao He, Bo Dai</span>
  </li>
  <li class="pub">
    <span class="pub-venue">arXiv &middot; 2026</span>
    <span class="pub-title"><a href="https://arxiv.org/abs/2606.08357">Forward-Free Diffusion Language Models</a></span>
    <span class="pub-authors">Haotian Sun, <span class="me">Rushi Qiang</span>, Yuqian Zheng, Bo Dai</span>
  </li>
  <li class="pub">
    <span class="pub-venue">arXiv &middot; 2025</span>
    <span class="pub-title"><a href="https://arxiv.org/abs/2505.21439">Towards Better Instruction Following Retrieval Models</a></span>
    <span class="pub-authors">Yuchen Zhuang<sup>*</sup>, Aaron Trinh<sup>*</sup>, <span class="me">Rushi Qiang</span><sup>*</sup>, Haotian Sun, Chao Zhang, Hanjun Dai, Bo Dai</span>
  </li>
</ul>

<p class="pub-note"><sup>*</sup> equal contribution &nbsp;&middot;&nbsp; <sup>&dagger;</sup> equal second authorship</p>


# Experience


<ul class="cv-list">
  <li>
    <span class="cv-body"><strong>Google DeepMind</strong>, Mountain View
      <span class="cv-detail">Student Researcher &middot; RL environments for agentic MLE and code optimization</span>
    </span>
    <span class="cv-date">Feb 2026 &ndash; present</span>
  </li>
</ul>


# Education

<ul class="cv-list">
  <li>
    <span class="cv-body"><strong>Georgia Institute of Technology</strong>, Atlanta
      <span class="cv-detail">Ph.D. student in Machine Learning &middot; co-advised by Bo Dai and Chao Zhang</span>
    </span>
    <span class="cv-date">Aug 2024 &ndash; present</span>
  </li>
  <li>
    <span class="cv-body"><strong>Tsinghua University</strong>, Beijing
      <span class="cv-detail">B.Eng. in Automation &middot; AGI Pilot Class (TONG Class)</span>
    </span>
    <span class="cv-date">Sep 2020 &ndash; Jun 2024</span>
  </li>
</ul>


# Academic Service

Reviewer for **NeurIPS**, **ICLR**, **ICML**, and **ACL Rolling Review**.
