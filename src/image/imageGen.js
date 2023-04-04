const fs = require('fs');
const path = require('path');
const { createSVG } = require('./createSVG');


async function findFileInDirectory(targetDir, fileName) {
  const files = await fs.promises.readdir(targetDir);
  for (const file of files) {
    const filePath = path.join(targetDir, file);
    const stats = await fs.promises.stat(filePath);
    if (stats.isDirectory()) {
      const result = await findFileInDirectory(filePath, fileName);
      if (result) {
        return result;
      }
    } else if (file === fileName) {
      return filePath;
    }
  }
 // return null;
//   console.log(file)
   throw new Error(`image not available`);
}

async function searchAndCopyFiles(text, directories, targetDirectory) {

    const inputs = text.split(",").map(input => input.trimStart());
    const wordSeparator = "sep";
  
    const splitInput = inputs.flatMap((input, index, array) => {
    const splittedInput = input.split(" ");

      if (index < array.length - 1) {
        splittedInput.push(wordSeparator);
      }
  
      return splittedInput;
    });

    const expandInputs = await expandShortcuts(splitInput);
    const splitInputs = await checkAndConvertCase(expandInputs);
    //console.log(expandInputs)
    //console.log(splitInputs)

    for (const char of splitInputs) {
        if (char === ' ') {
            // || char === wordSeparator) {
            continue;
    }

    const filename = char + '.svg';

    for (const dir of directories) {
      const filePath = path.join(dir, filename);
 //    console.log(filePath)
      if (fs.existsSync(filePath)) {
      //  console.log('copy')
        const destPath = path.join(targetDirectory, filename);
        await fs.promises.copyFile(filePath, destPath);
        break;
      }
      else {
 //       console.log('File not found: ' + filePath);
        await createSVG(char, targetDirectory);
      }
    }
  }

}

async function expandShortcuts(arr) {
  const shortcuts = {
    hcf: ["b", "db", "d", "df", "f"],
    qcf: ["d", "df", "f"],
    qcb: ["b", "db", "d"],
    hcb: ["f", "df", "d", "db", "b"],
    dp: ["f", "d", "df"]
  };

  const expandedArr = [];

  for (let i = 0; i < arr.length; i++) {
    if (shortcuts[arr[i].toLowerCase()]) {
      expandedArr.push(...shortcuts[arr[i].toLowerCase()]);
    } else {
      expandedArr.push(arr[i]);
    }
  }

  return expandedArr;
}

async function checkAndConvertCase(arr) {
  const shortcuts = {
    B: "bp",
    DB: "dbp",
    D: "dp",
    DF: "dfp",
    F: "fp",
    UF: "ufp",
    U: "up",
    UB: "ubp"
  };

  const mappedArr = [];

  for (let i = 0; i < arr.length; i++) {
    const str = arr[i];
    //console.log(str, /^\d+$/.test(str))
    if (str.length < 3 && str.toUpperCase() === str && !(/^\d+$/.test(str))) {
      mappedArr.push(shortcuts[str]);
    } else {
      console.log('e ' + str)
      mappedArr.push(str);
    }
  }

  return mappedArr;
}

module.exports = { searchAndCopyFiles, findFileInDirectory, expandShortcuts, checkAndConvertCase };