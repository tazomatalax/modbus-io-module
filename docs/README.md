# Documentation Index

Welcome to the Modbus IO Module documentation. This folder contains comprehensive guides for developers, engineers, and end-users.

## Quick Navigation

### For Getting Started
- **[System Overview](./architecture/system-overview.md)** – High-level architecture, data flows, and design principles
- **[Pinout & Interfaces](./hardware/pinout-and-interfaces.md)** – GPIO assignments, electrical specs, and interfaces

### For Development & Contribution
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** – Development standards, coding guidelines, and contribution workflow
- **[ROADMAP.md](../ROADMAP.md)** – Strategic phases, feature roadmap, and timeline

### For Deployment & Operations
- **[Calibration Guide](./guides/calibration-guide.md)** – Calibration formulas and engineering units
- **[Terminal Guide](./guides/terminal-guide.md)** – Diagnostic commands and troubleshooting

### For Technical Deep Dives
- **[EZO Sensor Polling](./technical/ezo-sensor-polling.md)** – Detailed EZO (Atlas Scientific) sensor implementation

---

## Directory Structure

```
docs/
├── architecture/
│   └── system-overview.md          # Layered architecture, data flows, memory management
├── guides/
│   ├── calibration-guide.md        # Calibration formulas and examples
│   └── terminal-guide.md           # Terminal commands and diagnostics
├── hardware/
│   └── pinout-and-interfaces.md    # Pin assignments and electrical specifications
├── technical/
│   └── ezo-sensor-polling.md       # EZO sensor implementation details
└── history/                         # Archive of past session notes (reference only)
```

---

## Key Resources

### For New Contributors
1. Read **CONTRIBUTING.md** for coding standards
2. Review **System Overview** to understand architecture
3. Check **ROADMAP.md** for current and planned features
4. Reference **Pinout & Interfaces** for hardware details

### For Adding New Sensors
1. Follow the checklist in **CONTRIBUTING.md** (Section 4: Sensor Integration Workflow)
2. Reference **EZO Sensor Polling** for I2C communication patterns
3. Update **System Overview** with new register allocations
4. Document calibration in **Calibration Guide**

### For Troubleshooting
1. Check **Terminal Guide** for diagnostic commands
2. Review **Pinout & Interfaces** for electrical specifications
3. Reference **System Overview** for timing constraints
4. Search **EZO Sensor Polling** for protocol-specific issues

---

## Recent Changes

- **2025-10-22**: Documentation consolidated and reorganized
  - Merged PLAN.md and IMPROVEMENT_PLAN.md into ROADMAP.md
  - Renamed AGENTS.md to CONTRIBUTING.md
  - Created docs/architecture/ for system design documents
  - Created docs/hardware/ for electrical specifications
  - Created docs/guides/ for operational guides
  - Moved EZO notes to docs/technical/ezo-sensor-polling.md

---

## Configuration Files

### Root Level
- **CONTRIBUTING.md** – Contribution guidelines (from AGENTS.md)
- **ROADMAP.md** – Project roadmap and feature planning
- **CHANGELOG.md** – Version history
- **README.md** – Project overview (condensed)

### Version Control
- **platformio.ini** – Build and library configuration
- **.gitignore** – Git exclusion rules
- **.github/workflows/** – CI/CD automation (if present)

### Governance
- **.github/governance/constitution.md** – Project governance
- **.github/governance/constitution_update_checklist.md** – Governance updates

---

## Contributing to Documentation

When adding or updating documentation:

1. **Location**: Place docs in the appropriate subdirectory (architecture/, guides/, hardware/, technical/)
2. **Format**: Use Markdown with clear headings and structure
3. **Links**: Use relative paths for internal links
4. **Examples**: Include code examples and diagrams where applicable
5. **Version**: Reference ROADMAP.md or CONTRIBUTING.md for the latest standards

---

## Questions?

Refer to **CONTRIBUTING.md** Section 12 (Rapid FAQ) for common development questions, or check the appropriate guide based on your task.
