const wait = (timeout) =>
  new Promise((resolve) => setTimeout(() => resolve(), timeout));

function getButton(id) {
  const el = document.getElementById(id);
  if (el instanceof HTMLButtonElement) {
    return el;
  }
  throw new Error();
}

function getInput(id) {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
    return el;
  }
  throw new Error();
}

const passInput = getInput("pass");
const nameInput = getInput("name");
const statusIndicator = document.getElementById("status");
const verifyForm = document.getElementById("verify-form");
const submitForm = document.getElementById("submit-form");
const main = document.querySelector("main");
const verifyButton = getButton("verify-button");
const submitButton = getButton("submit-button");

verifyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  getList();
});

submitForm.addEventListener("submit", (e) => {
  e.preventDefault();
  submit();
});

nameInput.addEventListener("change", (e) => {
  if (e.target instanceof HTMLInputElement && !!e.target.value) {
    submitButton.disabled = undefined;
  }
});

async function submit() {
  const passphrase = passInput.value;
  const name = nameInput.value;
  let data;
  try {
    const response = await fetch(
      "https://v5wbogy473uhfmobzefuoq2ueq0rdugr.lambda-url.us-east-2.on.aws/",
      {
        body: JSON.stringify({ passphrase, name }),
        method: "POST",
      }
    );
    data = await response.json();
  } catch (e) {
    await wait(200);
  }
  await wait(150);
  const p = document.createElement("p");
  p.textContent = `🎁 Your giftee is ${data.giftee} 🎁`;
  p.classList.add("giftee");
  main.appendChild(p);
}

async function getList() {
  const passphrase = passInput.value;
  statusIndicator.textContent = "⏳";
  passInput.disabled = true;
  verifyButton.disabled = true;
  let data;
  try {
    const response = await fetch(
      "https://v5wbogy473uhfmobzefuoq2ueq0rdugr.lambda-url.us-east-2.on.aws/",
      {
        body: JSON.stringify({ passphrase, list: true }),
        method: "POST",
      }
    );
    data = await response.json();
  } catch (e) {
    await wait(200);
    console.error(e.message);
    statusIndicator.textContent = "❌";
    verifyButton.textContent = "Re-verify";
    verifyButton.disabled = undefined;
    passInput.disabled = undefined;
    return;
  }

  await wait(150);
  
  if (Array.isArray(data?.list)) {
    statusIndicator.textContent = "✅";
    data.list.forEach((element) => {
      const option = new Option(element);
      nameInput.appendChild(option);
    });
  } else {
    statusIndicator.textContent = "❌";
    verifyButton.textContent = "Re-verify";
    verifyButton.disabled = undefined;
  }
}
