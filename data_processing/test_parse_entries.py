#!/usr/bin/env python3
"""
Test script for entry parsing logic
"""

import sys
import json
from parse_entries import parse_entries

def main():
    """Test the parse_entries function with a small sample of text."""
    # Sample text from the excerpt
    sample_text = """Wednesday, November 24, 1976—Vancouver—
New York
Got up at 7 A.M. in Vancouver and cabbed to the airport ($15 plus $5 tip,
magazines, $5). This is the end of the trip to Seattle for the opening at the
Seattle Art Museum there, then we'd gone to Los Angeles for Marisa
Berenson's wedding to Jim Randall, then to Vancouver for my Ace Gallery
show opening there. Nobody in Vancouver buys art, though—they're not
interested in painting. Catherine Guinness [see Introduction] didn't get
edgy till the last day when she started this annoying thing the English do—
asking me over and over, "What exactly is Pop Art?" It was like the time we
interviewed that blues guy Albert King for Interview, when she kept asking,
"What exactly is soul food?" So for two hours on the plane she tortured me
(cab from La Guardia $13, tip $7—Catherine was grand and gave him the
whole $20). Dropped Fred off. Got home. Ate an early Thanksgiving dinner
with Jed [see Introduction]. He'd gotten the car serviced for the drive down
to Chadds Ford in the morning to Phyllis and Jamie Wyeth's.
Thursday, November 25, 1976— New York—
Chadds Ford, Pennsylvania
Fred called at 8 A.M. to find out when we were leaving. Barbara Allen
came over at 10 A.M. and after a while we left in our rented car for Chadds
Ford. It was strange... 

Friday, November 26, 1976—Chadds Ford
Morning at Chadds Ford. Another day of activities."""

    # Parse the sample text
    entries = parse_entries(sample_text)
    
    # Print parsed entries
    print(json.dumps(entries, indent=2))
    print(f"Found {len(entries)} entries")

if __name__ == "__main__":
    main() 