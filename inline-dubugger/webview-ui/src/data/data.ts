export const data = {
  Title: "Basic Python",
  Panels: {
    "1": {
      question: `<h3>Write a function</h3><p>An extra day is added to the calendar almost every four years as February 29, and the day is called a leap day. It corrects the calendar for the fact that our planet takes approximately 365.25 days to orbit the sun. A leap year contains a leap day.</p><p>In the Gregorian calendar, three conditions are used to identify leap years:</p><ul><li>The year can be evenly divided by 4, is a leap year, unless:</li><ul><li>The year can be evenly divided by 100, it is NOT a leap year, unless:</li><ul><li>The year is also evenly divisible by 400. Then it is a leap year.</li></ul></ul></ul><p>This means that in the Gregorian calendar, the years 2000 and 2400 are leap years, while 1800, 1900, 2100, 2300, and 2500 are NOT leap years.</p><h4>Task</h4><p>Given a year, determine whether it is a leap year. If it is a leap year, return the Boolean <code>True</code>, otherwise return <code>False</code>.</p><p>Note that the code stub provided reads from STDIN and passes arguments to the <code>is_leap</code> function. It is only necessary to complete the <code>is_leap</code> function.</p><h5>Input Format</h5><p>Read year, the year to test.</p><h5>Output Format</h5><p>The function must return a Boolean value (True/False). Output is handled by the provided code stub.</p>`,
      Code: {
        editor: `def is_leap(year):\n\tpass`,
        TestCase: {
          1: {
            input: `2000`,
            output: `True`,
            status: ``,
            time: ``,
            try: ``,
          },
          2: {
            input: `1900`,
            output: `False`,
            status: ``,
            time: ``,
            try: ``,
          },
          3: {
            input: `2012`,
            output: `True`,
            status: ``,
            time: ``,
            try: ``,
          },
          4: {
            input: `2100`,
            output: `False`,
            status: ``,
            time: ``,
            try: ``,
          },
          5: {
            input: `2400`,
            output: `True`,
            status: ``,
            time: ``,
            try: ``,
          },
        },
      },
    },
    "2": {
      question: `
    <h3>Write a function to add two integers</h3>
    <p>Given two integer numbers, your task is to write a function that returns their sum.</p>
    <p>The function should accept two arguments and return a single integer value which is the sum of both.</p>
    <h4>Task</h4>
    <p>Implement a function that adds the two given numbers and returns the result.</p>
    <h5>Input Format</h5>
    <p>Two space-separated integers <code>a</code> and <code>b</code>.</p>
    <h5>Output Format</h5>
    <p>Return a single integer — the sum of <code>a</code> and <code>b</code>.</p>
  `,
      Code: {
        editor: `def add(a, b):\n\tpass`,
        TestCase: {
          1: { input: `5 7`, output: `12`, status: ``, time: ``, try: `` },
          2: { input: `-3 8`, output: `5`, status: ``, time: ``, try: `` },
          3: { input: `0 0`, output: `0`, status: ``, time: ``, try: `` },
          4: { input: `-10 -20`, output: `-30`, status: ``, time: ``, try: `` },
          5: { input: `123 456`, output: `579`, status: ``, time: ``, try: `` },
        },
      },
    },
  },
};
