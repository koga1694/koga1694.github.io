---
layout: base.njk
title: 홈
---

<div class="home-hero">
  <div class="purpose-badge">학습 기록 블로그</div>
  <h1>만들고 <span class="accent">배운 것들</span>의 기록</h1>
  <p>직접 만들어보면서 공부한 프로젝트들을 정리합니다.</p>
  <p>아키텍처 설계, 기술 선택의 이유, 삽질한 것들까지 빠짐없이 기록합니다.</p>
</div>

<section class="about-blog">
  <h2>이 블로그는</h2>
  <p>프로젝트를 만들면서 배운 것들을 기록하는 공간입니다. 아키텍처 결정의 이유, 예상치 못한 버그, 다음에 또 쓸 패턴들을 적어둡니다.</p>
  <p><strong>Eleventy + GitHub Pages</strong>로 만들었습니다. Node.js만 있으면 로컬에서 바로 띄울 수 있고, Markdown으로 편하게 씁니다. 굳이 CMS나 데이터베이스가 필요 없는 규모라 이 조합이 맞았습니다.</p>
  <p>앞으로 만드는 프로젝트들이 하나씩 추가될 예정입니다.</p>
</section>

<section class="projects-section">
  <h2>프로젝트</h2>
  <div class="project-cards">
    <a href="/projects/doityourself/" class="project-card">
      <div class="card-tag">Electron · Discord · AI</div>
      <h3>DoItYourself</h3>
      <p>코딩을 몰라도 Discord에서 대화하듯 소프트웨어를 만들 수 있는 데스크톱 앱. AI 에이전트가 실제 코드를 작성하고 배포까지 한다.</p>
      <div class="card-meta">
        <span class="tag">TypeScript</span>
        <span class="tag">Electron</span>
        <span class="tag">Discord.js</span>
        <span class="tag">Gemini · Claude · Codex</span>
      </div>
    </a>
  </div>
</section>
