// Preserve links shared by the original demo.
if (['#demo','#profile','#introduction/cedar','#introduction/alder','#introduction/harbour'].includes(location.hash)) {
  location.replace('/demo.html' + location.hash);
}
