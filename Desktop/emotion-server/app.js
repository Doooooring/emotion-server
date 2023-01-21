const util = require("util");
const exec = util.promisify(require("child_process").exec);
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

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

async function getSentiment(text) {
  const newToken = await getToken();
  console.log(newToken);
  const body = {
    encodingType: "UTF8",
    document: {
      type: "PLAIN_TEXT",
      content: text,
    },
  };
  const response = await axios.post(
    "https://language.googleapis.com/v1/documents:analyzeSentiment",
    body,
    {
      headers: {
        Authorization: `Bearer ${newToken.trim()}`,
        "Content-Type": "application/json; charset=utf-8",
        "x-goog-user-project": "projectforaeye",
      },
    }
  );
  console.log(response.data);
  return response.data;
}

function getSentimentAvg(sentences) {
  const totalStatic = sentences.reduce(
    (acc, cur) => {
      const { magnitude, score } = cur.sentiment;
      acc.totalScore += magnitude * score;
      if (score > 0) {
        const { positive } = acc;
        positive.totalMagnitude += magnitude;
        positive.totalScore += score;
        positive.number += 1;
      } else if (score < 0) {
        const { negative } = acc;
        negative.totalMagnitude += magnitude;
        negative.totalScore += score;
        negative.number += 1;
      }
      return acc;
    },
    {
      totalScore: 0,
      positive: {
        totalMagnitude: 0,
        totalScore: 0,
        number: 0,
      },
      negative: {
        totalMagnitude: 0,
        totalScore: 0,
        number: 0,
      },
    }
  );
  const getAvg = (curEmotion) => {
    const [magnitudeAvg, scoreAvg] = [
      curEmotion.totalMagnitude / curEmotion.number,
      curEmotion.totalScore / curEmotion.number,
    ];
    return { magnitudeAvg: magnitudeAvg, scoreAvg: scoreAvg };
  };
  const { totalScore } = totalStatic;
  const curEmotion =
    totalScore >= 0 ? totalStatic.positive : totalStatic.negative;
  const result = getAvg(curEmotion);

  return result;
}

const getEmotion = (magnitude, score) => {
  if (score > 0.5) {
    if (magnitude >= 0.75) {
      return "excited";
    } else if (magnitude > 0.5) {
      return "happy";
    } else if (magnitude > 0.25) {
      return "content";
    } else {
      return "relaxed";
    }
  } else if (score > 0.1) {
    if (magnitude > 0.25) {
      return "surprised(good reason)";
    } else {
      return "calm";
    }
  } else if (score >= -0.1) {
    return "anticiapte";
  } else if (score >= -0.5) {
    if (magnitude > 0.25) {
      return "surprised(bad reason)";
    } else {
      return "tired";
    }
  } else {
    if (magnitude >= 0.75) {
      return "tense";
    } else if (magnitude > 0.5) {
      return "angry";
    } else if (magnitude > 0.25) {
      return "sad";
    } else {
      return "bored";
    }
  }
};

app.post("/emotion", async (req, res) => {
  try {
    console.log(req.body);
    const { text } = req.body;
    const { sentences } = await getSentiment(text);
    const { magnitudeAvg, scoreAvg } = getSentimentAvg(sentences);
    console.log(magnitudeAvg, scoreAvg);
    const response = getEmotion(magnitudeAvg, scoreAvg);
    res.send({ sentences: sentences, response: response });
  } catch (e) {
    console.error(e);
  }
});

app.listen(port, () => {
  console.log("hi");
});
