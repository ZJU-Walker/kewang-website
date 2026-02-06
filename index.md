---
layout: page
title: Home
---

<div class="home-intro">

  <img src="{{ "/assets/img/profile.jpg" | relative_url }}"
       alt="Ke Wang"
       class="profile-img" />

  <div class="home-text">
    <h1>Ke Wang</h1>
    <p class="home-subtitle">
      MS @ Stanford University · Robotics · Reinforcement Learning · Safe Control
    </p>

    <p>
      I am a Master's student in Mechanical Engineering at Stanford University and a Research Assistant at
      Stanford Artificial Intelligence Laboratory (SAIL), advised by Prof. Chelsea Finn and Prof. Mac Schwager.
    </p>

    <p>
      My research focuses on robot learning for real-world autonomy, including dexterous humanoid manipulation
      with egocentric human data and onboard drone navigation in dynamic environments.
    </p>

    <p class="home-links">
      <a href="{{ "/research" | relative_url }}">Research</a> ·
      <a href="{{ "/publications" | relative_url }}">Publications</a> ·
      <a href="{{ "/cv" | relative_url }}">CV</a>
    </p>
  </div>

</div>

<hr />

<!-- Terminal academic tool panel -->
<div id="terminal" class="terminal">
  <div id="term-output"></div>
  <input id="term-input" type="text" autocomplete="off"
         placeholder="help · pub · bib egopi · theme dark" />
</div>
