// Decision tree data structure
const tree = {
  question: "Start: Do you like mysteries?",
  yes: {
    question: "Can you handle spooky stories?",
    yes: {
      question: "Then visit the haunted house!",
      yes: { question: "🎃 You survived! The end." },
      no:  { question: "👻 You chickened out. The end." }
    },
    no: {
      question: "Prefer light puzzles?",
      yes: { question: "🧩 Try a mystery jigsaw!" },
      no:  { question: "📚 Read a detective novel!" }
    }
  },
  no: {
    question: "Prefer action over mystery?",
    yes: {
      question: "Video games or sports?",
      yes: { question: "🎮 Play a shooter game!" },
      no:  { question: "⚽️ Go outside and play!" }
    },
    no: {
      question: "Just chilling?",
      yes: { question: "😴 Take a nap. The end." },
      no:  { question: "📺 Watch a comedy show. The end." }
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