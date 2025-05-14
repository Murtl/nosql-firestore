# HSA Abschlussarbeit

## Informationen für Studierende

Das Projekt stellt eine Vorlage für Ihre Abschlussarbeit dar. Bitte clonen
Sie das Projekt. Anschließend entfernen Sie am besten den Remote Host aus
dem Repository, und nutzen die Vorlage, um Ihre Arbeit zu schreiben.

Sollten Sie Änderungen an der Vorlage vornehmen, von denen Sie denken, sie
sind auch für andere Studierende interessant, zögern Sie bitte nicht, die
Änderungen an die Dozenten weiterzugeben oder besser noch diese in Gitlab 
unter [Issues](https://gitlab.informatik.hs-augsburg.de/tha-latex-templates/abschlussarbeit/-/issues) 
als **Improvement** oder **Feature** einzustellen. Wir werden die Anpassung, 
falls dies Sinn macht, dann in die Vorlage integrieren.

### Fehler im Template

Fehler können in der Vorlage immer vorhanden sein. Sollten Sie einen solchen
entdecken, melden Sie dies gerne auch unter [Issues](https://gitlab.informatik.hs-augsburg.de/tha-latex-templates/abschlussarbeit/-/issues) 
und wählen sie **Error** aus. Wir werden dann versuchen, den Fehler zu korrigieren.

### Wichtiger Hinweis

Sie müssen unabhängig von der Vorlage sicherstellen, dass Sie die formalen
Kriterien, die an die Abschlussarbeit gestellt werden, erfüllen. Sie sollten 
also bei der Titelseite, der Erklärung, der Literatur etc. jeweils mit
Ihrem Erstbetreuer klären, was die formalen Vorgaben sind, und dann selber
sicherstellen, dass Sie diese einhalten.

## Nutzung

Unter Linux kann die PDF mit
```sh
make
```
erzeugt werden. Notwendig ist hierfür eine normale TeX-Installation. 
Mithilfe von
```sh
make clean
```
können alle temporären Dateien gelöscht werden.

## HSA gitlab runner

Der Gitlab Runner ist zur Zeit so konfiguriert, dass mithilfe einer
Docker Installation für das Image "texlive/texlive" das makefile
genutzt wird, um die PDF Datei zu bauen. Die PDFs sind jeweils als
Build-Artefakte im Gitlab vorhanden. 
