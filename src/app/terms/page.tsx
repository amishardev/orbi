import React from 'react';
import Link from 'next/link';
import { GlassNavbar } from '@/components/landing/GlassNavbar';

export default function TermsPage() {
    return (
        <div className="h-screen w-full overflow-y-auto bg-black text-slate-300">
            {/* Navbar */}
            <GlassNavbar />

            {/* Content */}
            <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-10">
                        <h1 className="text-2xl font-semibold text-white mb-4">Orbi Terms of Service</h1>
                        <p className="text-sm text-slate-400">Last Updated: January 16, 2026</p>
                    </div>

                    {/* Content */}
                    <div className="space-y-8 text-[13px] leading-relaxed text-slate-300">
                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">1. Universal Service Terms (Applicable to All Services)</h2>
                            <p className="mb-3">
                                Welcome to Orbi. These Terms of Service ("Terms") govern your access to and use of the Orbi platform, including our website, web application, mobile application, features, services, content, and any related technologies (collectively, the "Service"). By accessing or using Orbi, you agree to be bound by these Terms. If you do not agree to these Terms, you must not access or use the Service.
                            </p>
                            <p>
                                Orbi is a social media and communication platform designed to allow users to connect, post content, engage in conversations, and participate in communities. The platform may include features such as public posts, private messaging, group chats, anonymous posting, media sharing, and other social interactions.
                            </p>
                        </section>

                        <section>
                            <p className="mb-3">
                                <strong className="text-white">1.1.</strong> By creating an account, logging in, browsing, or otherwise using Orbi, you confirm that you have read, understood, and agreed to these Terms, as well as our Privacy Policy and any additional guidelines or rules that may be posted from time to time. These Terms form a legally binding agreement between you ("User," "you," or "your") and Orbi ("Orbi," "we," "us," or "our").
                            </p>
                            <p>
                                If you are using Orbi on behalf of an organization, institution, or other entity, you represent and warrant that you have the authority to bind that entity to these Terms.
                            </p>
                        </section>

                        <section>
                            <p className="mb-3">
                                <strong className="text-white">1.2.</strong> You must be at least 13 years of age (or the minimum legal age in your jurisdiction) to use Orbi. By using the Service, you represent and warrant that you meet this eligibility requirement.
                            </p>
                            <p className="mb-3">
                                You are responsible for maintaining the confidentiality of your account credentials, including your password and any authentication methods used to access Orbi. You agree that all activities that occur under your account are your responsibility. Orbi is not liable for any loss or damage resulting from unauthorized access to your account.
                            </p>
                            <p>
                                You agree to provide accurate, current, and complete information when creating your account and to keep such information updated. Orbi reserves the right to suspend or terminate accounts that provide false, misleading, or incomplete information.
                            </p>
                        </section>

                        <section>
                            <p className="mb-3">
                                <strong className="text-white">1.3.</strong> Orbi is a user-generated content platform. This means that most content displayed on Orbi, including posts, comments, messages, media, and community interactions, is created and uploaded by users, not by Orbi.
                            </p>
                            <p className="mb-3">
                                Orbi does not pre-screen, monitor, endorse, or guarantee the accuracy, legality, or appropriateness of user-generated content. The views expressed by users do not represent the views of Orbi.
                            </p>
                            <p>
                                You acknowledge and agree that you may encounter content that is offensive, inaccurate, misleading, inappropriate, or otherwise objectionable. Your use of Orbi is at your own risk.
                            </p>
                        </section>

                        <section>
                            <p className="mb-3">
                                <strong className="text-white">1.4.</strong> By using Orbi, you agree to use the Service responsibly and lawfully. You agree not to violate any applicable local, state, national, or international laws or regulations; post or distribute content that is illegal, defamatory, hateful, threatening, abusive, harassing, obscene, or otherwise harmful; impersonate another person, entity, or organization; attempt to gain unauthorized access to Orbi systems, user accounts, or data; use Orbi to distribute malware, spam, or automated messages; or interfere with or disrupt the integrity, performance, or security of the Service.
                            </p>
                            <p>
                                Orbi reserves the right, but not the obligation, to remove content, restrict access, or suspend or terminate accounts that violate these Terms or that we believe may harm the platform or its users.
                            </p>
                        </section>

                        <section>
                            <p className="mb-3">
                                <strong className="text-white">1.5.</strong> Orbi may offer features that allow users to post or interact anonymously. When using anonymous features: your identity may be hidden from other users but is not hidden from Orbi; Orbi may retain internal records linking anonymous content to your account for moderation, security, legal, or compliance purposes; Orbi does not guarantee absolute anonymity and is not responsible for identification that occurs due to user behavior, technical limitations, or third-party actions; anonymous content remains subject to these Terms and all applicable laws.
                            </p>
                        </section>

                        <section>
                            <p className="mb-3">
                                <strong className="text-white">1.6.</strong> You retain ownership of the content you create and post on Orbi. However, by posting content on Orbi, you grant Orbi a non-exclusive, worldwide, royalty-free, transferable, sublicensable license to host, store, reproduce, modify, display, distribute, and use your content solely for the purpose of operating, improving, and promoting the Service.
                            </p>
                            <p className="mb-3">
                                This license remains in effect even if your content is shared by other users or appears in cached or archived versions of the platform.
                            </p>
                            <p>
                                You represent and warrant that you own or have the necessary rights to post the content you upload and that such content does not infringe on the rights of any third party.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">2. Data Storage and Platform Infrastructure</h2>
                            <p className="mb-3">
                                Orbi uses third-party infrastructure and service providers, including cloud hosting, databases, and content delivery networks, to operate the Service. User data may be stored and processed on servers located in different geographic regions.
                            </p>
                            <p className="mb-3">
                                While Orbi takes reasonable measures to protect data, you acknowledge that no system is completely secure. Orbi does not guarantee uninterrupted access, error-free operation, or absolute data security.
                            </p>
                            <p>
                                You agree that Orbi is not responsible for data loss, corruption, unauthorized access, or service interruptions resulting from factors beyond our reasonable control, including but not limited to network failures, cyberattacks, or third-party service outages.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">3. No Professional or Legal Responsibility</h2>
                            <p className="mb-3">
                                Orbi is provided for social interaction and communication purposes only. Content on Orbi does not constitute professional, legal, medical, financial, or academic advice.
                            </p>
                            <p>
                                You agree that Orbi is not responsible for decisions, actions, or consequences arising from content or interactions on the platform. You are solely responsible for your use of the Service and for evaluating the accuracy and reliability of any information obtained through Orbi.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">4. Modification of the Service</h2>
                            <p className="mb-3">
                                Orbi reserves the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice. Features may be added, removed, or changed as the platform evolves.
                            </p>
                            <p>
                                Orbi shall not be liable for any loss or inconvenience caused by changes to or discontinuation of the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">5. Privacy and Data Usage</h2>
                            <p className="mb-3">
                                Orbi respects user privacy and aims to handle personal data responsibly. Information collected by Orbi may include, but is not limited to, account information, profile data, user-generated content, metadata, usage logs, device information, and interaction data.
                            </p>
                            <p className="mb-3">
                                Orbi may collect and process data for purposes including: account creation and authentication; platform functionality and feature delivery; content moderation and abuse prevention; security, analytics, and performance optimization; legal compliance and enforcement of these Terms.
                            </p>
                            <p className="mb-3">
                                Orbi does not guarantee complete confidentiality of user data. While reasonable technical and organizational safeguards are used, you acknowledge that no digital platform is immune to risks such as unauthorized access, data breaches, or system failures.
                            </p>
                            <p>
                                By using Orbi, you consent to the collection, storage, processing, and transfer of your data as described in these Terms and in Orbi's Privacy Policy.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">6. Content Moderation and Enforcement</h2>
                            <p className="mb-3">
                                Orbi reserves the right, but does not assume the obligation, to monitor, review, moderate, remove, restrict, or disable access to any content or account at its sole discretion.
                            </p>
                            <p className="mb-3">
                                Content moderation actions may be taken for reasons including, but not limited to: violation of these Terms; legal or regulatory requirements; reports from other users; platform integrity, safety, or community well-being.
                            </p>
                            <p className="mb-3">
                                Moderation actions may include: content removal; temporary or permanent account suspension; feature restrictions; community or group removal; account termination.
                            </p>
                            <p>
                                Orbi is not required to provide prior notice or justification for moderation actions, though reasonable efforts may be made to notify affected users.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">7. Reporting and User Responsibility</h2>
                            <p className="mb-3">
                                Users may report content, accounts, or behavior they believe violates these Terms or applicable laws. Orbi does not guarantee immediate action or resolution of reports.
                            </p>
                            <p className="mb-3">
                                You acknowledge that false, malicious, or abusive reporting may itself result in enforcement action against your account.
                            </p>
                            <p>
                                Orbi does not act as an arbitrator in user disputes and is not responsible for resolving conflicts between users.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">8. Account Suspension and Termination</h2>
                            <p className="mb-3">
                                Orbi reserves the right to suspend or terminate your account at any time, with or without notice, if: you violate these Terms; you engage in harmful, illegal, or abusive behavior; your account poses a risk to the platform or other users; required by law or legal authority.
                            </p>
                            <p className="mb-3">
                                You may also choose to deactivate or delete your account. Certain data may be retained for legal, security, or operational purposes even after account deletion.
                            </p>
                            <p>
                                Orbi is not liable for any loss of content, connections, messages, or access resulting from account suspension or termination.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">9. Service Availability and Downtime</h2>
                            <p className="mb-3">
                                Orbi is provided on an "as-is" and "as-available" basis. We do not guarantee uninterrupted, timely, secure, or error-free operation.
                            </p>
                            <p className="mb-3">
                                The Service may be unavailable due to maintenance, updates, technical issues, or circumstances beyond Orbi's control, including third-party service outages or force majeure events.
                            </p>
                            <p>
                                Orbi shall not be liable for damages arising from service interruptions, delays, or data loss.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">10. Third-Party Services and Links</h2>
                            <p className="mb-3">
                                Orbi may integrate with or link to third-party services, platforms, or content. Orbi does not control, endorse, or assume responsibility for third-party services.
                            </p>
                            <p>
                                Your interactions with third-party services are governed solely by their respective terms and policies. Orbi is not responsible for any loss or harm resulting from such interactions.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">11. Disclaimer of Warranties</h2>
                            <p className="mb-3">
                                To the fullest extent permitted by applicable law, Orbi provides the Service on an "as is" and "as available" basis and expressly disclaims all warranties of any kind, whether express, implied, statutory, or otherwise, including but not limited to: implied warranties of merchantability; fitness for a particular purpose; non-infringement; accuracy, reliability, or completeness of any content.
                            </p>
                            <p className="mb-3">
                                Orbi does not review, endorse, verify, or guarantee any content posted by users, including anonymous content. All content available through the Service is solely the responsibility of the user who posted it.
                            </p>
                            <p className="mb-3">
                                Orbi does not warrant that: the Service will meet your expectations or requirements; the Service will be uninterrupted, timely, secure, or error-free; any defects or errors will be corrected; any content will be accurate, appropriate, lawful, or safe.
                            </p>
                            <p>
                                Your use of the Service is entirely at your own risk.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">12. Limitation of Liability</h2>
                            <p className="mb-3">
                                To the maximum extent permitted by law, Orbi, its founders, operators, developers, affiliates, and partners shall not be liable for any damages whatsoever, whether direct or indirect, including but not limited to: loss of data or content; loss of reputation or goodwill; emotional distress or mental harm; loss of profits, opportunities, or academic/career outcomes; harm resulting from user-generated content or interactions.
                            </p>
                            <p className="mb-3">
                                Orbi shall not be responsible or liable for any content posted, shared, or transmitted by users, including anonymous posts, messages, or media.
                            </p>
                            <p className="mb-3">
                                This limitation applies regardless of the legal theory under which liability is claimed and even if Orbi has been advised of the possibility of such damages.
                            </p>
                            <p>
                                Your sole and exclusive remedy for dissatisfaction with the Service is to stop using Orbi.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">13. Indemnification</h2>
                            <p className="mb-3">
                                You agree to indemnify, defend, and hold harmless Orbi, its founders, operators, employees, and affiliates from and against any and all claims, demands, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from or related to: your use or misuse of the Service; any content you post, upload, share, or transmit (including anonymous content); your violation of these Terms; your violation of any applicable law or regulation; your infringement of any third-party rights.
                            </p>
                            <p>
                                This obligation survives termination of your account or access to the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">14. Governing Law and Jurisdiction</h2>
                            <p className="mb-3">
                                These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles.
                            </p>
                            <p>
                                Any disputes, claims, or legal proceedings arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts located in India.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">15. Changes to These Terms</h2>
                            <p className="mb-3">
                                Orbi reserves the right to modify or update these Terms at any time at its sole discretion.
                            </p>
                            <p className="mb-3">
                                Updated Terms will become effective immediately upon posting within the Service or on its official platform. Your continued use of Orbi after such changes constitutes your acceptance of the revised Terms.
                            </p>
                            <p>
                                It is your responsibility to review these Terms periodically.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-white mb-3">16. Contact Information</h2>
                            <p>
                                If you have any questions, concerns, or legal inquiries regarding these Terms or the Service, you may contact Orbi through the official communication channels provided within the application.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
