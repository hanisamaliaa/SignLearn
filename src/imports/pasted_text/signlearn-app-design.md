Design a complete desktop-first responsive web application called "SignLearn", an AI-assisted Learning Management System (LMS) for learning Indonesian Sign Language (BISINDO).

The goal of this platform is to help:
- Parents who have deaf or hard-of-hearing children communicate better with their children.
- Deaf or hard-of-hearing people improve their BISINDO communication skills.
- General learners who want to learn Indonesian Sign Language.

This is an educational platform focused on accessibility, structured learning, and inclusive education.

========================================================
APPLICATION GOAL
========================================================

The platform provides structured BISINDO learning through sequential courses.

Users must complete lessons one by one.

Each lesson ends with a quiz.

The next lesson is locked until the learner passes the quiz with a minimum score (KKM) of 70.

The platform is NOT intended for diagnosing disabilities.

It is only a learning platform.

========================================================
SYSTEM ROLES
========================================================

There are ONLY TWO system roles.

1. User
2. Administrator

No Teacher.

No Parent Dashboard.

No Instructor.

No Guest Dashboard.

The registration options are NOT system roles.

========================================================
USER REGISTRATION
========================================================

Registration asks users to choose their learning profile.

The options are:

• Parent with Deaf Child
• Deaf / Hard of Hearing Learner
• General Learner

These are learning profiles only.

All of them become USER accounts.

Administrator accounts CANNOT be created through registration.

========================================================
LOGIN FLOW
========================================================

IF account role = USER

Open User Dashboard.

IF account role = ADMIN

Open Admin Dashboard.

Users must NEVER access admin pages.

Admins must NEVER access learner pages.

Use strict Role Based Access Control (RBAC).

========================================================
USER SIDEBAR
========================================================

Dashboard

Courses

Learning Progress

Profile

Settings

Logout

Nothing else.

========================================================
ADMIN SIDEBAR
========================================================

Dashboard

Users

Courses

Lessons

Videos

Quiz Management

Categories

Reports

Settings

Logout

========================================================
LANDING PAGE
========================================================

Hero Section

Benefits

How It Works

Learning Categories

Features

Testimonials

FAQ

Footer

CTA:
"Start Learning BISINDO"

Modern educational style.

========================================================
AUTHENTICATION
========================================================

Login

Register

Forgot Password

Email verification

Success pages

========================================================
USER DASHBOARD
========================================================

Display:

Welcome message

Continue Learning

Learning Progress

Current Course

Completed Courses

Locked Courses

Current Streak

Quiz Average

Recent Lessons

Recommended Next Lesson (based only on current learning path, NOT AI prediction)

Latest Activities

Quick Continue button

========================================================
COURSE PAGE
========================================================

Show course cards.

Each card contains:

Thumbnail

Course title

Level

Total lessons

Progress bar

Completed percentage

Lock status

Beginner categories:

Alphabet

Numbers

Greetings

Family

Colors

Food

Animals

Daily Activities

========================================================
COURSE DETAIL PAGE
========================================================

Display:

Course description

Difficulty

Estimated duration

Progress

List of lessons

Each lesson has status:

Completed

Current

Locked

Only one lesson is unlocked at a time.

========================================================
LESSON PAGE
========================================================

Show:

Video player

Subtitle

Vocabulary

Explanation

Gesture images

Replay button

Previous lesson

Start Quiz button

Hide "Next Lesson" until quiz is passed.

========================================================
QUIZ PAGE
========================================================

When quiz starts:

Automatically activate Focus Mode.

Focus Mode:

Fullscreen layout

Hide sidebar

Hide navbar

Hide notifications

Hide profile menu

Hide all distractions

Display only:

Question

Answer choices

Timer

Question number

Progress

Submit button

Exit Quiz confirmation

========================================================
QUIZ RESULT
========================================================

Passing score (KKM) = 70

IF score >=70

Show:

Congratulations

Score

Stars

Unlock next lesson

Continue Learning button

Update progress

IF score <70

Show:

Friendly encouragement

Explain minimum passing score is 70

Review Lesson button

Retry Quiz button

Keep next lesson locked

========================================================
COURSE LOCK
========================================================

Sequential learning is mandatory.

Users cannot jump to another lesson.

Users cannot unlock lessons manually.

Users must:

Finish current lesson.

Pass quiz.

Only then unlock the next lesson.

Locked lessons display lock icon.

Completed lessons display green check icon.

Current lesson displays highlighted active state.

========================================================
LEARNING PROGRESS
========================================================

Show:

Overall progress

Course completion

Lesson completion

Quiz history

Average score

Current learning streak

Achievements

========================================================
PROFILE
========================================================

Editable fields:

Photo

Name

Email

Phone

Learning Profile

Password

Save button

After clicking Save:

Changes must persist.

Display success notification.

Updated information remains after logout/login.

========================================================
SETTINGS
========================================================

Theme

Notifications

Language

Account Security

========================================================
ADMIN DASHBOARD
========================================================

Statistics:

Total Users

Total Courses

Total Lessons

Quiz Statistics

Learning Progress

Recent Users

Recent Activities

========================================================
USER MANAGEMENT
========================================================

Admin can:

Create users

Edit users

Delete users

Deactivate users

Search users

========================================================
COURSE MANAGEMENT
========================================================

Admin can:

Create course

Edit course

Delete course

Assign category

Upload thumbnail

========================================================
LESSON MANAGEMENT
========================================================

Admin can:

Create lesson

Edit lesson

Delete lesson

Arrange lesson order

Upload video

Upload subtitle

Upload vocabulary

========================================================
QUIZ MANAGEMENT
========================================================

Admin can:

Create questions

Multiple Choice

Image Matching

Gesture Identification

Set passing score

========================================================
REPORT PAGE
========================================================

Display:

Learning statistics

Popular courses

Average quiz score

Completion rate

========================================================
DESIGN SYSTEM
========================================================

Style:

Modern

Educational

Friendly

Minimal

Accessible

Professional

Rounded cards

Large spacing

8px spacing system

16px border radius

Soft shadow

Typography:

Inter

Colors:

Primary #4F8EF7

Secondary #EAF3FF

Success #2ECC71

Warning #F4B400

Danger #E74C3C

Background #F8FAFC

========================================================
ACCESSIBILITY
========================================================

Large buttons

Readable typography

High contrast

Keyboard friendly

Accessible color palette

Responsive desktop-first

========================================================
IMPORTANT BUSINESS RULES
========================================================

No Parent Dashboard.

No Teacher role.

Only User and Admin roles.

Registration profiles are not system roles.

Role Based Access Control is mandatory.

Course Lock is mandatory.

KKM = 70.

Quiz automatically enters Focus Mode.

Profile edits must be saved permanently.

Generate complete high-fidelity UI screens with reusable design components, consistent layouts, modern LMS styling, and realistic interactions suitable for a university capstone project.