import type React from 'react';
import { useAuthContext } from '../../contexts/AuthContext';

interface OAuthLinkingProps {
	className?: string;
}

const OAuthLinking: React.FC<OAuthLinkingProps> = ({ className = '' }) => {
	const { oauthProviders, oauthAccounts, linkOAuthAccount, unlinkOAuthAccount, isPending } =
		useAuthContext();

	const handleLink = async (providerId: string) => {
		try {
			await linkOAuthAccount(providerId);
		} catch (error) {
			console.error(`Failed to link ${providerId}:`, error);
		}
	};

	const handleUnlink = async (providerId: string, providerAccountId: string) => {
		try {
			await unlinkOAuthAccount(providerId, providerAccountId);
		} catch (error) {
			console.error(`Failed to unlink ${providerId}:`, error);
		}
	};

	const isLinked = (providerId: string) => {
		return oauthAccounts.some((account) => account.providerId === providerId);
	};

	const getLinkedAccount = (providerId: string) => {
		return oauthAccounts.find((account) => account.providerId === providerId);
	};

	return (
		<div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
			<h3 className="text-lg font-medium mb-4">Connected Accounts</h3>
			<p className="text-sm text-gray-600 mb-4">
				Link your social accounts for faster login and enhanced security.
			</p>

			<div className="space-y-4">
				{oauthProviders.map((provider) => {
					const linked = isLinked(provider.id);
					const account = getLinkedAccount(provider.id);

					return (
						<div
							key={provider.id}
							className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
						>
							<div className="flex items-center space-x-3">
								<div
									className="h-10 w-10 rounded-full flex items-center justify-center"
									style={{
										backgroundColor: `${provider.color}20`,
										border: `2px solid ${provider.color}`,
									}}
								>
									<span className="text-lg font-bold" style={{ color: provider.color }}>
										{provider.icon[0].toUpperCase()}
									</span>
								</div>
								<div>
									<h4 className="font-medium text-gray-900">{provider.name}</h4>
									{linked && account && (
										<p className="text-sm text-gray-500">
											{account.email ||
												`Connected as ${account.accountUsername || account.accountId}`}
										</p>
									)}
								</div>
							</div>

							<div className="flex items-center space-x-2">
								{linked ? (
									<>
										<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
											Connected
										</span>
										<button
											onClick={() => handleUnlink(provider.id, account?.providerAccountId)}
											disabled={isPending}
											className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Unlink
										</button>
									</>
								) : (
									<button
										onClick={() => handleLink(provider.id)}
										disabled={isPending}
										className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
										style={{ borderColor: provider.color }}
									>
										<span className="mr-1.5" style={{ color: provider.color }}>
											{provider.icon[0].toUpperCase()}
										</span>
										Connect
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>

			<div className="mt-6 pt-4 border-t border-gray-200">
				<h4 className="text-sm font-medium text-gray-900 mb-2">Security Benefits</h4>
				<ul className="text-sm text-gray-600 space-y-1">
					<li>• Eliminates need to remember multiple passwords</li>
					<li>• Enables two-factor authentication through social providers</li>
					<li>• Provides secure, phishing-resistant login options</li>
					<li>• Quick account recovery if password is lost</li>
				</ul>
			</div>
		</div>
	);
};

export default OAuthLinking;
