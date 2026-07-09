// --- Scenario Lab — slice 1 -------------------------------------------------
// En liten storytelling-övning: läs en situation, välj ett agerande, se den
// organisatoriska konsekvensen och en kort reflektion om arbetssättet. Detta är
// ett format-experiment — ingen motor, ingen persistence, ingen matematik. Bara
// text och val. Isolerat scope, self-init, inget delat med telecom/FlowLab.
//
// Datadrivet (scenariot bor som en konstant) men medvetet inte överbyggt — ett
// scenario, tre val. Fler scenarier kan läggas till senare om formatet bär.

(function EdLabScenarioModule() {
  "use strict";

  const SCENARIO = {
    situation:
      "Tre projekt pågår samtidigt i Göteborg, Växjö och Nederländerna. Alla behöver " +
      "samma systemarkitekt inför en viktig milstolpe. Projektledarna rapporterar grönt, " +
      "men resursägaren säger att kapaciteten inte räcker.",
    options: [
      {
        label: "Låt projekten lösa det själva.",
        consequence:
          "Lokal optimering. Varje projekt gör sitt bästa för sig — men ingen ser " +
          "helheten, och risken för dolda förseningar som dyker upp sent är stor."
      },
      {
        label: "Eskalera till styrgrupp.",
        consequence:
          "Ett beslut kan fattas — men utan bra underlag riskerar styrgruppen att bara " +
          "flytta problemet, inte lösa det. Snabbt beslut, oklar kvalitet."
      },
      {
        label: "Skapa gemensam lägesbild: synliggör beroenden, kapacitet och beslutspunkt.",
        consequence:
          "Organisationen får bättre beslutsunderlag och kan prioritera medvetet. Det " +
          "kostar lite tid nu, men beslutet blir grundat och beroendena syns innan de " +
          "blir förseningar."
      }
    ],
    reflection:
      "Arbetssättet vi provkör är den gemensamma lägesbilden: när beroenden, kapacitet " +
      "och beslutspunkt är synliga kan organisationen prioritera medvetet i stället för " +
      "att skjuta problemet vidare. Prova de andra valen och jämför konsekvenserna."
  };

  let dom = null;
  let chosen = -1;

  function init() {
    dom = {
      situation: document.getElementById("edl-sc-situation"),
      options: document.getElementById("edl-sc-options"),
      result: document.getElementById("edl-sc-result")
    };
    if (!dom.options) return; // sektionen finns inte → gör inget
    renderSituation();
    renderOptions();
    console.info("[EdLabScenario] ready");
  }

  function renderSituation() {
    if (dom.situation) dom.situation.textContent = SCENARIO.situation;
  }

  function renderOptions() {
    dom.options.innerHTML = "";
    SCENARIO.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "edl-sc-option" + (i === chosen ? " edl-sc-option-active" : "");
      btn.innerHTML =
        `<span class="edl-sc-option-num">${i + 1}</span>` +
        `<span class="edl-sc-option-label"></span>`;
      btn.querySelector(".edl-sc-option-label").textContent = opt.label;
      btn.addEventListener("click", () => choose(i));
      dom.options.appendChild(btn);
    });
  }

  function choose(i) {
    chosen = i;
    renderOptions();     // uppdatera aktiv-markering
    renderResult(i);
  }

  function renderResult(i) {
    if (!dom.result) return;
    const opt = SCENARIO.options[i];
    dom.result.innerHTML =
      `<div class="edl-sc-block">` +
        `<div class="edl-sc-heading">Konsekvens</div>` +
        `<p class="edl-sc-text"></p>` +
      `</div>` +
      `<div class="edl-sc-block edl-sc-reflection">` +
        `<div class="edl-sc-heading">Vad lärde vi oss om arbetssättet?</div>` +
        `<p class="edl-sc-text edl-sc-reflection-text"></p>` +
      `</div>`;
    dom.result.querySelector(".edl-sc-text").textContent = opt.consequence;
    dom.result.querySelector(".edl-sc-reflection-text").textContent = SCENARIO.reflection;
    dom.result.hidden = false;
  }

  init();
  window.EdLabScenario = { choose };
})();
