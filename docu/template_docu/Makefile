# You want latexmk to *always* run, because make does not have all the info.
# Also, include non-file targets in .PHONY so they are run regardless of any
# file of the given name existing.
.PHONY: Abschlussarbeit-ohneR.pdf all clean

# The first rule in a Makefile is the one executed by default ("make"). It
# should always be the "all" rule, so that "make" and "make all" are identical.
all: Abschlussarbeit-ohneR.pdf

# CUSTOM BUILD RULES

# In case you didn't know, '$@' is a variable holding the name of the target,
# and '$<' is a variable holding the (first) dependency of a rule.
# "raw2tex" and "dat2tex" are just placeholders for whatever custom steps
# you might have.

#%.tex: %.raw
#        ./raw2tex $< > $@

#%.tex: %.dat
#        ./dat2tex $< > $@

# Convert Excel File to csv with in2csv from package csvkit.
# Remove the comments to activate the rule.
# URL:
#     https://github.com/wireservice/csvkit
# Using apt-get (Ubuntu):
#     apt-get install csvkit
#%.csv: %.xlsx
#        ./in2csv $< > $@

# MAIN LATEXMK RULE

# -pdf tells latexmk to generate PDF directly (instead of DVI).
# -pdflatex="" tells latexmk to call a specific backend with specific options.
# -use-make tells latexmk to call make for generating missing files.

# -interaction=nonstopmode keeps the pdflatex backend from stopping at a
# missing file reference and interactively asking you for an alternative.

Abschlussarbeit-ohneR.pdf: Abschlussarbeit-ohneR.tex
	latexmk -pdf -pdflatex="pdflatex -interaction=nonstopmode" -use-make Abschlussarbeit-ohneR.tex

clean:
	latexmk -CA

