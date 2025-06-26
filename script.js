// Decision tree data structure
const tree = {
  question: "Start: Wil je iets bewaren?",
  yes: {
    question: "Is het open geweest?",
    yes: {
      question: "Eet je het op binnen een week?",
      yes: { question: "Op je eigen plankje is prima." },
      no:  { question: "In de harde plastic bakken of in een glazen pot hoort dit thuis" }
    },
    no: {
      question: "Kan een mot of larve er in komen?",
      yes: { question: "In de harde plastic bakken of in een glazen pot hoort dit thuis." },
      no:  { question: "Op je eigen plankje is prima" }
    }
  },
  no: {
    question: "Doe je dit dan voor de lol?",
    yes: {
      question: "Quizvraag: Ligt New York zuidelijker dan Rome?",
      yes: { question: "Heel goed! 100 punten" },
      no:  { question: "Haha sukkel, echt wel." }
    },
    no: {
      question: "Gek dat je dit niet voor de lol doet. Wil je een tip?",
      yes: { question: "MURDER ALLE MOTTEN DIE JE ZIET, BEWAAR AL JE SPULLEN LUCHT DICHT EN VER WEG!!!!" },
      no:  { question: "Nou dan niet, doei he!" }
    }
  }
};

let currentNode = tree;
const qEl = document.getElementById("question");
const yesBtn = document.getElementById("yes");
const noBtn  = document.getElementById("no");

function render() {
  qEl.textContent = currentNode.question;
  // hide buttons at leaf nodes
  yesBtn.style.display = currentNode.yes ? 'block' : 'none';
  noBtn.style.display  = currentNode.no  ? 'block' : 'none';
}

yesBtn.addEventListener('click', () => {
  if (currentNode.yes) {
    currentNode = currentNode.yes;
    render();
  }
});

noBtn.addEventListener('click', () => {
  if (currentNode.no) {
    currentNode = currentNode.no;
    render();
  }
});

// initialize
render();