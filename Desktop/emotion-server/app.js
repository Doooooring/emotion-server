const util = require("util");
const exec = util.promisify(require("child_process").exec);
const express = require("express");
const axios = require("axios");

const app = express();
const port = 3000;

const token =
  "ya29.a0AX9GBdXxSt3G3-xGrBATiXJCOqxIlJDSfe6ygq0Lw3O6NelI2qlA3Ne2zs0l00cLDfoTT_KxPDHGDtHrWr_vJCfXQXpFoCgauSHXKgzUr-DyIZGrYoFuOHrdWez9opo39w7cK1sNUiCnNS76i_EFqUOKZZxf-OJoaCgYKASgSAQASFQHUCsbC6B5ZoeckzmNkVY9XjwZsrQ0167";

let newToken = "";

async function getToken() {
  try {
    const { stdout, stderr } = await exec(
      "gcloud auth application-default print-access-token"
    );

    if (stderr) {
      console.error(`stderr : ${stderr}`);
    }
    return stdout;
  } catch (e) {
    console.error(e);
  }
}

async function submit(text) {
  const newToken = await getToken();
  const body = {
    encodingType: "UTF8",
    document: {
      type: "PLAIN_TEXT",
      content: text,
    },
  };
  const response = await axios.post(`${newToken}`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
      "x-goog-user-project": "projectforaeye",
    },
  });

  return response.data;
}

app.post("/emotion", async (req, res) => {
  const { text } = req.body;
  const response = await submit(text);
  const { documentSentiment } = response.data;

  res.send(response);
});

app.listen(port, () => {
  console.log("hi");
});
