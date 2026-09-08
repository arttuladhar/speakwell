const corePracticeLoop = [
  "Record: Record yourself on video performing the daily exercise.",
  "Watch (Muted): Review body language, facial expressions, and gestures.",
  "Listen (Audio Only): Review fillers, vocal variety, and pacing.",
];

const days = [
  {
    day: 1,
    title: "Removing the Filter",
    focus:
      "Build fluency and reduce the mental friction that causes freezing, mumbling, or rambling.",
    presentation:
      "Today is fluency over perfection. Reduce self-editing so words can flow under pressure.",
    exerciseDuration: "2 minutes",
    exercise: [
      "Pick any object nearby.",
      "Talk continuously about it for 2 minutes.",
      "Do not pause to think; keep verbal momentum.",
      "If stuck, narrate what you are thinking in the moment.",
      "Review with the Core Practice Loop.",
    ],
    reflection: [
      "Did speaking without filtering become easier after the first 30 seconds?",
      "Did your audio feel rambling or flowing?",
      "What body language patterns appeared when searching for words?",
    ],
    resources: [
      {
        title: "Be Better at Spontaneous Speaking",
        source: "Stanford Graduate School of Business",
        url: "https://www.gsb.stanford.edu/insights/be-better-spontaneous-speaking",
        description:
          "Explore how to approach unplanned speaking. Pick one idea to try when you feel yourself overthinking your next sentence.",
        type: "Article",
      },
      {
        type: "Practice card",
        title: "Your no-filter prompt bank",
        source: "Speakwell",
        steps: [
          "Choose one: a mug, a key, a shoe, or a window.",
          "Start with “What I notice about this is…” Then describe its shape, purpose, and a memory it brings up.",
          "If you get stuck, try “Another thing this makes me think of is…” Keep exploring rather than starting over.",
        ],
      },
    ],
  },
  {
    day: 2,
    title: "The Volume Dial",
    focus: "Break monotone delivery by using full vocal range.",
    presentation:
      "Stretch your voice by practicing extremes so normal conversational tone becomes more dynamic.",
    exerciseDuration: "3 minutes",
    exercise: [
      "Speak on any topic while changing volume every 15-20 seconds.",
      "Level 1-2: Whisper.",
      "Level 5: Normal conversation.",
      "Level 10: Loud stage voice.",
      "Review how pace and gestures change at each level.",
    ],
    reflection: [
      "Which was harder: whisper or shout?",
      "Was the contrast clearly audible?",
      "How did body language shift between quiet and loud delivery?",
    ],
    resources: [
      {
        title: "The Most Common Technique—Volume",
        source: "Toastmasters International",
        url: "https://toastmasters.org/magazine/magazine-issues/2017/mar2017/volume",
        description:
          "Learn how volume changes can add emphasis. Listen for whether your louder and quieter moments serve the meaning of your words.",
        type: "Article",
      },
      {
        type: "Practice card",
        title: "One sentence, three deliveries",
        source: "Speakwell",
        steps: [
          "Use this line: “I have something exciting to share with you.”",
          "Say it quietly to one person, conversationally to a friend, then project it toward the back of a room. Keep your voice comfortable; don’t force a shout.",
          "Record all three versions. Which words become more noticeable as you change the volume?",
        ],
      },
    ],
  },
  {
    day: 3,
    title: "Conquering Filler Words",
    focus: "Replace filler words with purposeful silence.",
    presentation:
      "Filler words are a buffering signal. Convert that signal into calm, controlled pauses.",
    exerciseDuration: "3 minutes",
    exercise: [
      "Repeat a narration-style talk for 3 minutes.",
      "Aim for zero fillers (um/uh).",
      "When a filler is coming, stop and take a 2-second silent breath.",
      "Resume with the next sentence only when ready.",
      "Review audio specifically for filler slips.",
    ],
    reflection: [
      "How often did you catch a filler before saying it?",
      "Did slower pace improve control or increase anxiety?",
      "When fillers slipped through, what triggered them?",
    ],
    resources: [
      {
        title: "Drop Those Crutches",
        source: "Toastmasters International",
        url: "https://toastmasters.org/magazine/magazine-issues/2019/feb/drop-those-crutches",
        description:
          "Read about habitual filler words and deliberate pauses. Use the article to choose one verbal habit to notice in your next recording.",
        type: "Article",
      },
      {
        type: "Practice card",
        title: "A pause-and-listen scorecard",
        source: "Speakwell",
        steps: [
          "Speak about your morning routine for one minute and listen back. Tally your most frequent filler word.",
          "Repeat the same topic. Leave a quiet breath between ideas when you feel that filler coming.",
          "Compare the two takes: note filler counts and whether the pauses sounded comfortable. Aim for awareness, not a perfect score.",
        ],
      },
    ],
  },
  {
    day: 4,
    title: "Speak with a Smile",
    focus: "Use facial expression to shape vocal tone.",
    presentation:
      "A smile changes vocal resonance and perceived energy. Train expressive tone through facial setup.",
    exerciseDuration: "2 minutes",
    exercise: [
      "Pick a positive topic and smile for 3 seconds before speaking.",
      "Maintain smile throughout the first minute.",
      "Switch to a boring topic while keeping the smile.",
      "Observe vocal energy and expression consistency.",
      "Review with muted and audio passes.",
    ],
    reflection: [
      "Did you look more approachable on video?",
      "Could you hear the smile in your voice?",
      "Did your tone drop when switching to the boring topic?",
    ],
    resources: [
      {
        title: "Gestures and Body Language",
        source: "Toastmasters International",
        url: "https://www.toastmasters.org/resources/public-speaking-tips/gestures-and-body-language",
        description:
          "Explore nonverbal delivery, including facial expression. Watch your recording on mute and notice whether your expression fits the message.",
        type: "Article",
      },
      {
        type: "Practice card",
        title: "Match your face to your message",
        source: "Speakwell",
        steps: [
          "Try a warm welcome: “I’m really glad you could join us today.” Let your expression match that intention.",
          "Now describe a small success you enjoyed this week. Use a natural smile rather than holding a fixed expression.",
          "Watch muted for approachability, then listen without video for warmth. Write down one difference you noticed.",
        ],
      },
    ],
  },
  {
    day: 5,
    title: "Framework 1: Past, Present, Future",
    focus: "Structure stories into clear, logical narratives.",
    presentation:
      "Use temporal signposts to avoid getting lost: past context, present state, future direction.",
    exerciseDuration: "90 seconds each run",
    exercise: [
      "Choose a prompt (memory, career journey, proud project).",
      "Use signposts: In the past..., But now..., And in the future....",
      "Spend 2-3 sentences in each part.",
      "Repeat with 2-3 different prompts.",
      "Review for clarity and narrative flow.",
    ],
    reflection: [
      "Did structure reduce pressure versus free-flow speaking?",
      "Did signposts keep your answer on track?",
      "Was your story easier to follow on replay?",
    ],
    resources: [
      {
        title:
          "Tips and Techniques for More Confident and Compelling Presentations",
        source: "Stanford Graduate School of Business",
        url: "https://www.gsb.stanford.edu/insights/matt-abrahams-tips-techniques-more-confident-compelling-presentations",
        description:
          "Find the “Structure Sets You Free” section for the Past–Present–Future framework. Use its structure to organize your next story.",
        type: "Article",
      },
      {
        type: "Practice card",
        title: "Your three-part story outline",
        source: "Speakwell",
        steps: [
          "Past: “When I first started learning ___, I struggled with ___.”",
          "Present: “Today, I can ___ because I changed ___.”",
          "Future: “Next, I want to ___, and my first step is ___.” Try this with a hobby, a project, or a personal goal.",
        ],
      },
    ],
  },
  {
    day: 6,
    title: "Integration & Recap",
    focus: "Isolate and reinforce micro-skills from Days 1-5.",
    presentation:
      "Train one skill at a time to build automaticity before stacking everything together.",
    exerciseDuration: "10-12 minutes total",
    exercise: [
      "Complete five 2-minute recordings.",
      "Drill 1: Fluency only.",
      "Drill 2: Volume variety only.",
      "Drill 3: No fillers only.",
      "Drill 4: Smile and expression only.",
      "Drill 5: Past-Present-Future structure only.",
    ],
    reflection: [
      "Which skill felt most natural?",
      "Which skill remains hardest?",
      "What should be your post-course continued drill focus?",
    ],
    resources: [
      {
        title: "Prep Talk",
        source: "Toastmasters International",
        url: "https://www.toastmasters.org/magazine/magazine-issues/2019/oct/prep-talk",
        description:
          "Explore ways to make rehearsal time productive. Choose one preparation technique to use during your five-skill recap.",
        type: "Article",
      },
      {
        type: "Practice card",
        title: "Your five-skill review sheet",
        source: "Speakwell",
        steps: [
          "Use the same topic for all five drills: “Something I recently learned.” Focus on fluency, volume, pauses, expression, then story structure.",
          "After each recording, write one observation about only that drill’s skill. This keeps your review focused.",
          "Choose your strongest skill and one to revisit. Save both in your reflection so you can compare them in a future session.",
        ],
      },
    ],
  },
  {
    day: 7,
    title: "BLUF (Bottom Line Up Front)",
    focus: "Answer directly and concisely.",
    presentation:
      "Give the answer first, then optional explanation. Practice short, complete responses.",
    exerciseDuration: "3 minutes",
    exercise: [
      "Prepare 5-10 simple questions.",
      "For each, answer in ~10 seconds.",
      "Reframe question in your answer for clarity.",
      "Stop immediately after the BLUF.",
      "Repeat rapid-fire for full time.",
    ],
    reflection: [
      "How hard was it to stop without over-explaining?",
      "Did answers feel crisp and complete?",
      "Did question reframing improve response speed?",
    ],
    resources: [
      {
        title:
          "How to “Think Faster and Talk Smarter”: a Masterclass with Matt Abrahams",
        source: "Stanford Graduate School of Business",
        url: "https://www.gsb.stanford.edu/insights/how-think-faster-talk-smarter-masterclass-matt-abrahams",
        description:
          "Read the “Focus, focus, focus” takeaway for concise, audience-centered communication. Apply it by giving your answer in the first sentence.",
        type: "Article",
      },
      {
        type: "Practice card",
        title: "Answer-first flash prompts",
        source: "Speakwell",
        steps: [
          "Answer each in one sentence: What should we do this weekend? Which tool would you recommend? Is the project on track? What should we prioritize today? What did you learn this week?",
          "Example: “We should prioritize the rehearsal today.” Stop there before deciding whether more detail is needed.",
          "Repeat with a 10-second limit per answer. Check that your first sentence answers the actual question.",
        ],
      },
    ],
  },
  {
    day: 8,
    title: "Word Association Lightning (P-E)",
    focus: "Expand BLUF with Point-Explanation structure.",
    presentation:
      "State your point, then support it with a fluid because-clause explanation.",
    exerciseDuration: "5 minutes",
    exercise: [
      "Pick an object nearby.",
      "Part 1 (10s): Make one clear point about it.",
      "Part 2 (30-45s): Explain why using natural associations.",
      "Switch objects and repeat 3-4 rounds.",
      "Review for point-to-explanation coherence.",
    ],
    reflection: [
      "Did your explanation stay tied to your point?",
      "Were you able to layer delivery skills too?",
      "How did this feel for thinking on your feet?",
    ],
    resources: [
      {
        title: "10 Tips from Toastmasters International",
        source: "Toastmasters International",
        url: "https://toastmasters.org/magazine/magazine-issues/2021/june/ten-tips-from-ti",
        description:
          "Tip 5 introduces a point followed by a reason. Practice just that opening pair today; you’ll add evidence and a closing point on Day 10.",
        type: "Article",
      },
      {
        type: "Practice card",
        title: "The “because” bridge",
        source: "Speakwell",
        steps: [
          "Choose a notebook, a water bottle, or a pair of headphones. State one opinion about it in 10 seconds.",
          "Connect with “because…” and spend 30–45 seconds explaining that opinion. Example: “A notebook helps me focus because writing an idea down gives me one thing to work on.”",
          "Switch objects for three rounds. On replay, check that each explanation supports its opening point.",
        ],
      },
    ],
  },
  {
    day: 9,
    title: "Framework 2: What? So What? Now What?",
    focus: "Deliver meaningful updates with implication and action.",
    presentation:
      "Most people stop at facts (What). Strong speakers emphasize impact (So What) and next step (Now What).",
    exerciseDuration: "5 minutes",
    exercise: [
      "Choose a work/life update topic.",
      "Use signposts: What's happening is..., This is important because..., So our next step is....",
      "Deliver 1-minute updates.",
      "Repeat with 2-3 new topics.",
      "Review for audience relevance and actionable close.",
    ],
    reflection: [
      "Which part was hardest: What, So What, or Now What?",
      "Did this structure speed up idea organization?",
      "Where can you apply this next (meeting/email/proposal)?",
    ],
    resources: [
      {
        title: "One Communication Tool You Should Add to Your Toolkit",
        source: "Stanford Graduate School of Business",
        url: "https://www.gsb.stanford.edu/insights/one-communication-tool-you-should-add-your-toolkit",
        description:
          "Read the What? So What? Now What? breakdown and its real-world examples. Notice how each update ends with a clear next step.",
        type: "Article",
      },
      {
        type: "Practice card",
        title: "A one-minute update template",
        source: "Speakwell",
        steps: [
          "What: “Our rehearsal moved to Thursday.” State the situation without background detail.",
          "So what: “That gives us one less day to make changes.” Explain why your listener should care.",
          "Now what: “Please send your slides by Wednesday morning.” End with an action. Replace the example with an update from your own life.",
        ],
      },
    ],
  },
  {
    day: 10,
    title: "Framework 3: PREP",
    focus: "Deliver complete persuasive arguments.",
    presentation:
      "Use PREP: Point, Reason, Example, Point to make clear and memorable arguments.",
    exerciseDuration: "5-7 minutes",
    exercise: [
      "Pick an opinion-based prompt.",
      "Point: state your position clearly.",
      "Reason: explain why it matters.",
      "Example: provide short evidence/story.",
      "Point: restate your claim as the conclusion.",
    ],
    reflection: [
      "Did the example make your argument stronger?",
      "Did the final point land as a strong close?",
      "Which framework now feels most useful for your real use cases?",
    ],
    resources: [
      {
        title: "10 Tips from Toastmasters International",
        source: "Toastmasters International",
        url: "https://toastmasters.org/magazine/magazine-issues/2021/june/ten-tips-from-ti",
        description:
          "Use Tip 5 as a reference for the complete PREP sequence: Point, Reason, Example, Point. Check that your argument includes all four parts.",
        type: "Article",
      },
      {
        type: "Practice card",
        title: "Build your first PREP argument",
        source: "Speakwell",
        steps: [
          "Point: “We should make time for a weekly team demo.” Reason: “It helps us spot misunderstandings early.”",
          "Example: Describe a real occasion when showing your work helped someone understand it. Use a specific detail rather than an invented statistic.",
          "Point: “That’s why I recommend a short demo every Friday.” Now try your own topic: a habit worth adopting, a place worth visiting, or a change at work.",
        ],
      },
    ],
  },
];

module.exports = { corePracticeLoop, days };
