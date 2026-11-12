// Starter templates for "+ New diagram". One per diagram type that Visimer can
// edit (see DIAGRAM_TYPES in @visimer/core). ZenUML is left out because it needs
// a separate Mermaid plugin that this app does not load.

export const BLANK = '';

export const TEMPLATES = [
  {
    id: 'flowchart',
    label: 'Flowchart',
    code: `flowchart TD
  A[Start] --> B{Ready?}
  B -->|Yes| C[Finish]
  B -->|No| A
`
  },
  {
    id: 'sequence',
    label: 'Sequence diagram',
    code: `sequenceDiagram
  actor User
  participant App
  participant API
  User->>App: Open page
  App->>API: Request data
  API-->>App: Data
  App-->>User: Show result
`
  },
  {
    id: 'class',
    label: 'Class diagram',
    code: `classDiagram
  class Customer {
    +String name
    +placeOrder()
  }
  class Order {
    +Date created
    +total() Decimal
  }
  Customer "1" --> "*" Order : places
`
  },
  {
    id: 'state',
    label: 'State diagram',
    code: `stateDiagram-v2
  [*] --> Draft
  Draft --> Review : submit
  Review --> Draft : changes requested
  Review --> Approved : approve
  Approved --> [*]
`
  },
  {
    id: 'er',
    label: 'Entity relationship',
    code: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    string name
    string email
  }
  ORDER {
    int id
    date created
  }
`
  },
  {
    id: 'journey',
    label: 'User journey',
    code: `journey
  title Ordering online
  section Browse
    Find product: 4: Customer
    Read reviews: 3: Customer
  section Buy
    Checkout: 2: Customer
    Confirmation email: 5: Customer, System
`
  },
  {
    id: 'gantt',
    label: 'Gantt chart',
    code: `gantt
  title Project plan
  dateFormat YYYY-MM-DD
  section Discovery
    Requirements :a1, 2026-01-05, 10d
    Design       :a2, after a1, 7d
  section Delivery
    Build        :b1, after a2, 20d
    Test         :b2, after b1, 10d
    Go live      :milestone, after b2, 0d
`
  },
  {
    id: 'pie',
    label: 'Pie chart',
    code: `pie title Time spent
  "Build" : 45
  "Test" : 25
  "Design" : 20
  "Meetings" : 10
`
  },
  {
    id: 'quadrant',
    label: 'Quadrant chart',
    code: `quadrantChart
  title Effort against value
  x-axis Low effort --> High effort
  y-axis Low value --> High value
  quadrant-1 Plan carefully
  quadrant-2 Quick wins
  quadrant-3 Fill-ins
  quadrant-4 Avoid
  Option A: [0.3, 0.8]
  Option B: [0.7, 0.7]
  Option C: [0.2, 0.3]
  Option D: [0.8, 0.2]
`
  },
  {
    id: 'requirement',
    label: 'Requirement diagram',
    code: `requirementDiagram
  requirement login {
    id: 1
    text: Users must sign in
    risk: high
    verifymethod: test
  }
  element auth_service {
    type: service
  }
  auth_service - satisfies -> login
`
  },
  {
    id: 'gitgraph',
    label: 'Git graph',
    code: `gitGraph
  commit
  branch feature
  checkout feature
  commit
  commit
  checkout main
  merge feature
  commit
`
  },
  {
    id: 'c4',
    label: 'C4 context',
    code: `C4Context
  title System context
  Person(user, "User", "Uses the system")
  System(app, "Application", "Does the work")
  System_Ext(mail, "Email service", "Sends notifications")
  Rel(user, app, "Uses")
  Rel(app, mail, "Sends email via")
`
  },
  {
    id: 'mindmap',
    label: 'Mindmap',
    code: `mindmap
  root((Project))
    Goals
      Faster delivery
      Lower cost
    Risks
      Budget
      Skills
    People
      Sponsor
      Team
`
  },
  {
    id: 'timeline',
    label: 'Timeline',
    code: `timeline
  title Product history
  2024 : Idea : Prototype
  2025 : First release
  2026 : Version 2 : New markets
`
  },
  {
    id: 'sankey',
    label: 'Sankey',
    code: `sankey-beta
Budget,Staff,60
Budget,Software,25
Budget,Training,15
Staff,Delivery,45
Staff,Support,15
`
  },
  {
    id: 'xychart',
    label: 'XY chart',
    code: `xychart-beta
  title "Monthly sales"
  x-axis [Jan, Feb, Mar, Apr, May, Jun]
  y-axis "Sales" 0 --> 100
  bar [30, 45, 50, 62, 70, 85]
  line [30, 45, 50, 62, 70, 85]
`
  },
  {
    id: 'block',
    label: 'Block diagram',
    code: `block-beta
  columns 3
  Client space Server
  space space space
  Database:3
  Client --> Server
  Server --> Database
`
  },
  {
    id: 'packet',
    label: 'Packet',
    code: `packet-beta
  0-15: "Source port"
  16-31: "Destination port"
  32-63: "Sequence number"
  64-95: "Acknowledgement number"
`
  },
  {
    id: 'kanban',
    label: 'Kanban',
    code: `kanban
  todo[To do]
    t1[Write requirements]
    t2[Plan testing]
  doing[In progress]
    t3[Build feature]
  done[Done]
    t4[Set up project]
`
  },
  {
    id: 'architecture',
    label: 'Architecture',
    code: `architecture-beta
  group cloud(cloud)[Cloud]
  service web(internet)[Web app] in cloud
  service api(server)[API] in cloud
  service db(database)[Database] in cloud
  web:R --> L:api
  api:R --> L:db
`
  },
  {
    id: 'radar',
    label: 'Radar',
    code: `radar-beta
  title Skills
  axis design["Design"], build["Build"], test["Test"], ops["Operations"], docs["Documentation"]
  curve current["Current"]{3, 4, 2, 3, 2}
  curve target["Target"]{4, 4, 4, 4, 4}
  max 5
  min 0
`
  },
  {
    id: 'treemap',
    label: 'Treemap',
    code: `treemap-beta
"Budget"
  "Staff"
    "Delivery": 45
    "Support": 15
  "Software": 25
  "Training": 15
`
  }
];
