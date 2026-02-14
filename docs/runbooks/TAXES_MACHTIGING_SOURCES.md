# Taxes Authorization Sources (Official)

This flow follows official public guidance and does not request DigiD credentials from the user.

Official references used for UX copy and process states:

1. Belastingdienst - registratieproces gegevens vooraf ingevulde aangifte voor intermediair  
https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/overige_belastingen/gegevens_vooraf_ingevulde_aangifte_voor_uw_intermediair/registratieproces_gegevens_vooraf_ingevulde_aangifte_voor_uw_intermediair

2. Belastingdienst - machtiging registreren voor intermediair  
https://www.belastingdienst.nl/wps/wcm/connect/nl/gegevens_vooraf_ingevulde_aangifte_voor_uw_intermediair/content/machtiging-registreren-voor-uw-intermediair

3. Logius - Belastingdienst voor intermediairs  
https://www.logius.nl/domeinen/toegang/digid-machtigen/belastingdienst-voor-intermediairs

4. Belastingdienst - gegevens vooraf ingevulde aangifte voor intermediair (authorization by tax year)  
https://www.belastingdienst.nl/wps/wcm/connect/nl/gegevens_vooraf_ingevulde_aangifte_voor_uw_intermediair/gegevens_vooraf_ingevulde_aangifte_voor_uw_intermediair

## Notes

- Current implementation models status transitions and document collection.
- Real intermediary request initiation/confirmation through Digipoort is not integrated yet.
- TODO: add server-side confirmation integration once official channel is available.
