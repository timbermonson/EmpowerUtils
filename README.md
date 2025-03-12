# EmpowerUtils

A collection of utils written by Timber Monson for automating office tasks at an HOA management company.

Basic usage guides are below, and a developer guide is at `./src/README.md` (TODO)

# Initial Install

**nvm & node**

- Windows: install "windows-nvm" by downloading "nvm-setup.exe" from [Here](https://github.com/coreybutler/nvm-windows/releases).
- Then, install the proper node version with `nvm install v22.14.0` and `nvm use v22.14.0`


- macOS: install "nvm" by following the instructions [Here](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating).
- macOS' nvm should auto-install & use the correct node version when you use `cd ./src`

**npm packages**

- Install npm/nodemon globally with `npm i -g nodemon`
- Set your cwd with `cd ./src` (do this before doing anything else, really)
- Clear out old packages with `rm -Force node_modules` on Windows, or `rm -rf node_modules` on mac.
- run `npm i` to install all packages.

# Address Scraper

**This app**:

- _Intakes:_ A list of names.
  
- _Does:_ A property search for every person in each (supported) county, then intelligently narrows results to 1 county with 1 result per-person.
  
- _Outputs:_ Each person's name and address, formatted to paste into Excel. 

**Example Screenshot**
![image](https://github.com/user-attachments/assets/9b96cd3c-7747-40da-9523-0a4993c91c96)



### Input Format:
Valid Examples:

`Director John G Smith, Treasurer Timber M Monson, President George Washington`

`D John     Smith, T Timber Monson   , P George Washington `

- Titles required, but ignored.
- Names must be separated by commas.
- Middlenames optional, used in search when present.
- Extra spaces and duplicate names are ignored.

### Execution:

- Set cwd: `cd ./src`
- In `src/ioFiles`, create an `input.txt` & put your list in it.
- Run app with `npm run addr`
- Output will appear in `src/ioFiles/output.txt`
- Pasting new namelists into `input.txt` will automatically trigger the app to run again.

### Extra Options:

- `npm run addr json` Outputs a newline-less json blob of the results (with a bit more information)
- `num run addr both` Outputs both.

# Business Principal Extractor

This app is designed to help with copying business principals from Utah's business-search into the above-app's required format.

**This app**:
- _Intakes:_ A click-drag copy-paste of the "Business Principals" table on the Utah Business Search website. (in `src/ioFiles/input.txt`)
- _Outputs:_ The list of business principals, formatted as above & with titles shortened. (into `src/ioFiles/output.txt`)

**Example Screenshots:**
![image](https://github.com/user-attachments/assets/5be0f8c1-d24e-4250-a471-e93de877215c)
![image](https://github.com/user-attachments/assets/b57b57bb-3e9b-4bcd-9f14-0fba94ce968b)

**Execution**

- Set cwd: `cd ./src`
- Run app with `npm run ebp`
- Output will appear in `src/ioFiles/output.txt`
